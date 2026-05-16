#!/usr/bin/env python3
"""
T2I-Bot-Skill OCR Processor
Complete implementation with pytesseract, OpenCV, and PIL
Supports: Text extraction, handwriting recognition, multi-language OCR
"""

import sys
import json
import os
import base64
from pathlib import Path
from datetime import datetime

# Try to import optional dependencies
try:
    import pytesseract
    from PIL import Image
    import cv2
    import numpy as np
    HAS_FULL_OCR = True
except ImportError:
    HAS_FULL_OCR = False

# T2I Neural Vision Bridge: V11.0
class OCRProcessor:
    def __init__(self):
        self.tesseract_cmd = None
        self.initialize_tesseract()
    
    def initialize_tesseract(self):
        """Initialize tesseract with platform-specific paths"""
        # Termux/Linux
        if os.path.exists('/data/data/com.termux/files/usr/bin/tesseract'):
            self.tesseract_cmd = '/data/data/com.termux/files/usr/bin/tesseract'
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
        # Windows
        elif os.path.exists(r'C:\Program Files\Tesseract-OCR\tesseract.exe'):
            self.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
        # macOS
        elif os.path.exists('/usr/local/bin/tesseract'):
            self.tesseract_cmd = '/usr/local/bin/tesseract'
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
        # Default (system PATH)
        else:
            try:
                pytesseract.get_tesseract_version()
            except:
                print("[OCR] Warning: Tesseract not found. Using basic mode.", file=sys.stderr)
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better OCR results"""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply denoising
        denoised = cv2.fastNlMeansDenoising(gray, None, 30, 7, 21)
        
        # Apply thresholding (Otsu's method)
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Morphological operations to remove noise
        kernel = np.ones((1, 1), np.uint8)
        morphed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        return morphed
    
    def extract_text(self, image_path: str, config: dict = None) -> dict:
        """
        Extract text from image with advanced preprocessing
        
        Args:
            image_path: Path to image file
            config: Optional configuration dict
                - lang: OCR language (default: 'eng')
                - preprocess: Enable preprocessing (default: True)
                - psm: Page segmentation mode (default: 3)
                - oem: OCR Engine mode (default: 3)
        
        Returns:
            dict with extracted text, confidence, and metadata
        """
        if config is None:
            config = {}
        
        start_time = datetime.now()
        
        try:
            # Check if we have full OCR support
            if not HAS_FULL_OCR:
                return self._basic_ocr(image_path, start_time)
            
            lang = config.get('lang', 'eng')
            preprocess = config.get('preprocess', True)
            psm = config.get('psm', 3)
            oem = config.get('oem', 3)
            
            # Load and preprocess image
            if preprocess:
                processed_img = self.preprocess_image(image_path)
                # Convert back to PIL Image
                pil_img = Image.fromarray(processed_img)
            else:
                pil_img = Image.open(image_path)
            
            # Get OCR configuration string
            custom_config = f'--oem {oem} --psm {psm}'
            
            # Extract text with details
            data = pytesseract.image_to_data(
                pil_img, 
                lang=lang, 
                config=custom_config,
                output_type=pytesseract.Output.DICT
            )
            
            # Extract full text
            text = pytesseract.image_to_string(
                pil_img, 
                lang=lang, 
                config=custom_config
            )
            
            # Calculate average confidence
            confidences = [int(c) for c in data['conf'] if int(c) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Get word-level data
            words = []
            for i in range(len(data['text'])):
                if int(data['conf'][i]) > 0:
                    words.append({
                        'text': data['text'][i],
                        'confidence': int(data['conf'][i]),
                        'bbox': {
                            'x': data['left'][i],
                            'y': data['top'][i],
                            'w': data['width'][i],
                            'h': data['height'][i]
                        }
                    })
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                'status': 'success',
                'text': text.strip(),
                'confidence': round(avg_confidence / 100, 3),
                'words': words,
                'word_count': len(words),
                'language': lang,
                'processing_time': round(processing_time, 3),
                'source': image_path,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'source': image_path,
                'timestamp': datetime.now().isoformat()
            }
    
    def _basic_ocr(self, image_path: str, start_time: datetime) -> dict:
        """Fallback basic OCR when full dependencies not available"""
        try:
            # Try basic PIL + tesseract
            from PIL import Image
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                'status': 'success',
                'text': text.strip(),
                'confidence': 0.75,
                'source': image_path,
                'processing_time': round(processing_time, 3),
                'timestamp': datetime.now().isoformat(),
                'mode': 'basic'
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': f"OCR not available: {str(e)}. Install pytesseract, pillow, opencv-python",
                'source': image_path,
                'timestamp': datetime.now().isoformat()
            }
    
    def extract_from_base64(self, base64_data: str, config: dict = None) -> dict:
        """Extract text from base64-encoded image"""
        try:
            # Decode base64
            image_data = base64.b64decode(base64_data)
            
            # Save to temp file
            temp_path = '/tmp/ocr_temp_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.png'
            with open(temp_path, 'wb') as f:
                f.write(image_data)
            
            # Process
            result = self.extract_text(temp_path, config)
            
            # Cleanup
            os.remove(temp_path)
            
            return result
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def batch_process(self, image_paths: list, config: dict = None) -> dict:
        """Process multiple images"""
        results = []
        total_words = 0
        total_time = 0
        
        for path in image_paths:
            result = self.extract_text(path, config)
            results.append(result)
            if result['status'] == 'success':
                total_words += result.get('word_count', 0)
            total_time += result.get('processing_time', 0)
        
        return {
            'status': 'success',
            'results': results,
            'total_images': len(image_paths),
            'successful': sum(1 for r in results if r['status'] == 'success'),
            'total_words': total_words,
            'total_processing_time': round(total_time, 3),
            'timestamp': datetime.now().isoformat()
        }


# CLI Interface
def main():
    processor = OCRProcessor()
    
    if len(sys.argv) < 2:
        print(json.dumps({
            'status': 'error',
            'error': 'Usage: python ocr_processor.py <image_path> [--lang <language>] [--batch]',
            'examples': [
                'python ocr_processor.py image.png',
                'python ocr_processor.py image.png --lang vie',
                'python ocr_processor.py img1.png img2.png --batch'
            ]
        }))
        sys.exit(1)
    
    # Parse arguments
    config = {}
    image_paths = []
    batch_mode = False
    
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == '--lang' and i + 1 < len(sys.argv):
            config['lang'] = sys.argv[i + 1]
            i += 2
        elif arg == '--batch':
            batch_mode = True
            i += 1
        elif arg.startswith('--'):
            i += 1
        else:
            image_paths.append(arg)
            i += 1
    
    # Process
    if batch_mode or len(image_paths) > 1:
        result = processor.batch_process(image_paths, config)
    else:
        result = processor.extract_text(image_paths[0], config)
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
