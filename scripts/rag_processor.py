#!/usr/bin/env python3
"""
T2I-Bot-Skill RAG (Retrieval-Augmented Generation) Implementation
Complete implementation with ChromaDB, embeddings, and semantic search
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

# Try to import optional dependencies
try:
    import chromadb
    from chromadb.config import Settings
    from sentence_transformers import SentenceTransformer
    import numpy as np
    HAS_FULL_RAG = True
except ImportError:
    HAS_FULL_RAG = False


class RAGProcessor:
    """RAG processor for T2I-Bot-Skill neural memory"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.collection_name = self.config.get('collection', 't2i-bot-skill-memory')
        self.chroma_path = self.config.get('chroma_path', './chroma_db')
        self.embedding_model = self.config.get('embedding_model', 'all-MiniLM-L6-v2')
        self.client = None
        self.collection = None
        self.embedding_model_instance = None
        
        self.initialize()
    
    def initialize(self):
        """Initialize ChromaDB and embedding model"""
        if not HAS_FULL_RAG:
            print("[RAG] Warning: Full RAG not available. Install chromadb, sentence-transformers", file=sys.stderr)
            return
        
        try:
            # Initialize ChromaDB
            self.client = chromadb.PersistentClient(path=self.chroma_path)
            
            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            
            # Initialize embedding model
            self.embedding_model_instance = SentenceTransformer(self.embedding_model)
            
            print(f"[RAG] Initialized collection: {self.collection_name}")
            print(f"[RAG] Embedding model: {self.embedding_model}")
            
        except Exception as e:
            print(f"[RAG] Error initializing: {e}", file=sys.stderr)
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embeddings for text"""
        if not self.embedding_model_instance:
            # Fallback: simple hash-based embedding
            return [hash(text) % 1000 / 1000.0] * 384
        
        embedding = self.embedding_model_instance.encode(text)
        return embedding.tolist()
    
    def add_document(self, text: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Add a document to the RAG collection"""
        if not self.collection:
            return {
                'status': 'error',
                'error': 'RAG not initialized',
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            # Generate ID
            doc_id = metadata.get('id', f"doc_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            
            # Generate embedding
            embedding = self.embed_text(text)
            
            # Prepare metadata
            doc_metadata = metadata or {}
            doc_metadata['timestamp'] = datetime.now().isoformat()
            doc_metadata['word_count'] = len(text.split())
            
            # Add to collection
            self.collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                metadatas=[doc_metadata],
                documents=[text]
            )
            
            return {
                'status': 'success',
                'id': doc_id,
                'metadata': doc_metadata,
                'timestamp': datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def query(self, query_text: str, n_results: int = 5, filter_metadata: Dict = None) -> Dict[str, Any]:
        """Query the RAG collection for similar documents"""
        if not self.collection:
            return {
                'status': 'error',
                'error': 'RAG not initialized',
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            # Generate query embedding
            query_embedding = self.embed_text(query_text)
            
            # Query collection
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=filter_metadata
            )
            
            # Format results
            formatted_results = []
            if results and results['ids'] and len(results['ids'][0]) > 0:
                for i, id in enumerate(results['ids'][0]):
                    formatted_results.append({
                        'id': id,
                        'text': results['documents'][0][i] if results['documents'] else '',
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': float(results['distances'][0][i]) if results['distances'] else 0.0,
                        'similarity': 1.0 - float(results['distances'][0][i]) if results['distances'] else 0.0
                    })
            
            # Sort by similarity
            formatted_results.sort(key=lambda x: x['similarity'], reverse=True)
            
            return {
                'status': 'success',
                'query': query_text,
                'results': formatted_results,
                'result_count': len(formatted_results),
                'timestamp': datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def search(self, query: str, **kwargs) -> Dict[str, Any]:
        """Convenience method for querying"""
        return self.query(query, **kwargs)
    
    def add_codebase(self, directory: str, extensions: List[str] = None) -> Dict[str, Any]:
        """Index a codebase directory"""
        if extensions is None:
            extensions = ['.py', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.md', '.json']
        
        indexed_files = []
        errors = []
        
        try:
            root_path = Path(directory)
            if not root_path.exists():
                return {
                    'status': 'error',
                    'error': f'Directory not found: {directory}',
                    'timestamp': datetime.now().isoformat()
                }
            
            for file_path in root_path.rglob('*'):
                if file_path.is_file() and file_path.suffix in extensions:
                    try:
                        # Skip large files
                        if file_path.stat().st_size > 100000:
                            continue
                        
                        # Read file content
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        
                        # Skip empty files
                        if not content.strip():
                            continue
                        
                        # Create chunks (simple chunking by lines)
                        lines = content.split('\n')
                        chunk_size = 50
                        for i in range(0, len(lines), chunk_size):
                            chunk = '\n'.join(lines[i:i+chunk_size])
                            if chunk.strip():
                                metadata = {
                                    'file': str(file_path),
                                    'type': 'code',
                                    'extension': file_path.suffix,
                                    'chunk': i // chunk_size,
                                    'total_chunks': (len(lines) + chunk_size - 1) // chunk_size
                                }
                                result = self.add_document(chunk, metadata)
                                if result['status'] == 'success':
                                    indexed_files.append(str(file_path))
                    
                    except Exception as e:
                        errors.append({'file': str(file_path), 'error': str(e)})
            
            return {
                'status': 'success',
                'indexed_files': len(set(indexed_files)),
                'errors': errors[:10],  # Limit error reporting
                'timestamp': datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        if not self.collection:
            return {
                'status': 'error',
                'error': 'RAG not initialized',
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            count = self.collection.count()
            
            return {
                'status': 'success',
                'collection': self.collection_name,
                'document_count': count,
                'chroma_path': self.chroma_path,
                'embedding_model': self.embedding_model,
                'timestamp': datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def delete_collection(self) -> Dict[str, Any]:
        """Delete the collection"""
        if not self.client:
            return {
                'status': 'error',
                'error': 'RAG not initialized',
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            self.client.delete_collection(self.collection_name)
            
            return {
                'status': 'success',
                'message': f'Collection {self.collection_name} deleted',
                'timestamp': datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }


# CLI Interface
def main():
    processor = RAGProcessor()
    
    if len(sys.argv) < 2:
        print(json.dumps({
            'status': 'info',
            'usage': 'python rag_processor.py <command> [args]',
            'commands': {
                'query <text>': 'Search neural memory',
                'add <text>': 'Add document to memory',
                'index <directory>': 'Index a codebase directory',
                'stats': 'Show collection statistics',
                'clear': 'Delete collection'
            },
            'examples': [
                'python rag_processor.py query "how to edit files"',
                'python rag_processor.py add "T2I-Bot-Skill is an AI orchestration system"',
                'python rag_processor.py index ./src',
                'python rag_processor.py stats'
            ]
        }, indent=2))
        sys.exit(0)
    
    command = sys.argv[1]
    
    if command == 'query' and len(sys.argv) > 2:
        query_text = ' '.join(sys.argv[2:])
        result = processor.query(query_text)
    
    elif command == 'add' and len(sys.argv) > 2:
        text = ' '.join(sys.argv[2:])
        result = processor.add_document(text)
    
    elif command == 'index' and len(sys.argv) > 2:
        directory = sys.argv[2]
        result = processor.add_codebase(directory)
    
    elif command == 'stats':
        result = processor.get_stats()
    
    elif command == 'clear':
        result = processor.delete_collection()
    
    else:
        result = {
            'status': 'error',
            'error': f'Unknown command: {command}',
            'timestamp': datetime.now().isoformat()
        }
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
