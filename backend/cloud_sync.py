import os
import sys
import time
import logging
from typing import Optional, Generator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - CLOUD_SYNC - %(levelname)s - %(message)s'
)
logger = logging.getLogger("CloudSync")

try:
    from google.cloud import storage
    from google.api_core.exceptions import RetryError, GoogleAPIError
    from google.api_core import retry
except ImportError as e:
    logger.error(f"Failed to import required libraries: {e}")
    logger.info("Please install required packages: pip install google-cloud-storage")
    sys.exit(1)

class CloudSync:
    """
    Handles reliable synchronization between local files and Google Cloud Storage.
    Implements streaming and exponential backoff for network instability.
    """
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.storage_client = self._initialize_storage()

    def _initialize_storage(self) -> Optional[storage.Client]:
        """Initializes the Google Cloud Storage client."""
        try:
            client = storage.Client(project=self.project_id)
            logger.info("Successfully initialized Google Cloud Storage client.")
            return client
        except Exception as e:
            logger.error(f"Failed to initialize Storage client: {e}")
            return None

    @retry.Retry(predicate=retry.if_exception_type(GoogleAPIError), initial=1.0, maximum=60.0, multiplier=2.0, deadline=300.0)
    def upload_file_stream(self, bucket_name: str, source_file_name: str, destination_blob_name: str, chunk_size: int = 1024 * 1024 * 5) -> bool:
        """
        Uploads a file to Google Cloud Storage using streaming and exponential backoff.
        chunk_size defaults to 5MB.
        """
        if not self.storage_client:
            logger.error("Storage client is not initialized.")
            return False

        try:
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(destination_blob_name)
            
            # Set chunk size for resumable uploads
            blob.chunk_size = chunk_size

            logger.info(f"Starting streaming upload of {source_file_name} to gs://{bucket_name}/{destination_blob_name}")
            
            start_time = time.time()
            with open(source_file_name, "rb") as f:
                blob.upload_from_file(f)
            end_time = time.time()
            
            logger.info(f"Successfully uploaded {source_file_name} in {end_time - start_time:.2f} seconds.")
            return True
            
        except FileNotFoundError:
            logger.error(f"Source file {source_file_name} not found.")
            return False
        except RetryError as e:
            logger.error(f"Upload failed after maximum retries: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during upload: {e}")
            return False

    @retry.Retry(predicate=retry.if_exception_type(GoogleAPIError), initial=1.0, maximum=60.0, multiplier=2.0, deadline=300.0)
    def download_file_stream(self, bucket_name: str, source_blob_name: str, destination_file_name: str, chunk_size: int = 1024 * 1024 * 5) -> bool:
        """
        Downloads a file from Google Cloud Storage using streaming and exponential backoff.
        """
        if not self.storage_client:
            logger.error("Storage client is not initialized.")
            return False

        try:
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(source_blob_name)
            
            # Set chunk size for resumable downloads
            blob.chunk_size = chunk_size

            logger.info(f"Starting streaming download of gs://{bucket_name}/{source_blob_name} to {destination_file_name}")
            
            start_time = time.time()
            with open(destination_file_name, "wb") as f:
                blob.download_to_file(f)
            end_time = time.time()
            
            logger.info(f"Successfully downloaded {destination_file_name} in {end_time - start_time:.2f} seconds.")
            return True
            
        except RetryError as e:
            logger.error(f"Download failed after maximum retries: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during download: {e}")
            return False

    def sync_directory(self, bucket_name: str, local_dir: str, prefix: str = "") -> bool:
        """
        Synchronizes a local directory to a GCS bucket.
        """
        if not os.path.isdir(local_dir):
            logger.error(f"Local directory {local_dir} does not exist.")
            return False
            
        logger.info(f"Starting sync of {local_dir} to gs://{bucket_name}/{prefix}")
        success = True
        
        for root, _, files in os.walk(local_dir):
            for file in files:
                local_path = os.path.join(root, file)
                # Calculate relative path for GCS object name
                rel_path = os.path.relpath(local_path, local_dir)
                blob_name = os.path.join(prefix, rel_path).replace(os.sep, '/')
                
                if not self.upload_file_stream(bucket_name, local_path, blob_name):
                    logger.error(f"Failed to sync {local_path}")
                    success = False
                    
        if success:
            logger.info(f"Successfully synchronized {local_dir} to gs://{bucket_name}/{prefix}")
        else:
            logger.warning(f"Sync completed with errors for {local_dir}")
            
        return success

if __name__ == "__main__":
    # Example usage
    logger.info("Starting Cloud Sync validation...")
    
    sync = CloudSync()
    
    # Note: To run actual syncs, you need a valid bucket and file.
    # bucket_name = "your-gcs-bucket-name"
    # source_file = "test.txt"
    # dest_blob = "test.txt"
    # 
    # if os.path.exists(source_file):
    #     sync.upload_file_stream(bucket_name, source_file, dest_blob)
    
    logger.info("Cloud Sync initialization complete.")
