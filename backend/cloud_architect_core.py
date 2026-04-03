import os
import sys
import logging
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("CloudArchitectCore")

try:
    from google.cloud import resourcemanager_v3
    from google.api_core.exceptions import GoogleAPIError
    import firebase_admin
    from firebase_admin import credentials, firestore, auth
except ImportError as e:
    logger.error(f"Failed to import required libraries: {e}")
    logger.info("Please install required packages: pip install google-cloud-resource-manager firebase-admin")
    sys.exit(1)

class CloudArchitectCore:
    """
    Core logic for managing Google Cloud Resources and Firebase Admin operations.
    """
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not self.project_id:
            logger.warning("GOOGLE_CLOUD_PROJECT environment variable not set. Some operations may fail.")
        
        self.rm_client = self._initialize_resource_manager()
        self.firebase_app = self._initialize_firebase()
        
    def _initialize_resource_manager(self) -> Optional[resourcemanager_v3.ProjectsClient]:
        """Initializes the Google Cloud Resource Manager client."""
        try:
            client = resourcemanager_v3.ProjectsClient()
            logger.info("Successfully initialized Google Cloud Resource Manager client.")
            return client
        except Exception as e:
            logger.error(f"Failed to initialize Resource Manager client: {e}")
            return None

    def _initialize_firebase(self) -> Optional[firebase_admin.App]:
        """Initializes the Firebase Admin SDK."""
        try:
            # Check if already initialized
            if firebase_admin._apps:
                logger.info("Firebase Admin SDK already initialized.")
                return firebase_admin.get_app()
                
            # Use application default credentials if specific cert isn't provided
            cred = credentials.ApplicationDefault()
            app = firebase_admin.initialize_app(cred, {
                'projectId': self.project_id
            })
            logger.info(f"Successfully initialized Firebase Admin SDK for project: {self.project_id}")
            return app
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
            return None

    def list_gcp_projects(self, parent: str = "organizations/YOUR_ORG_ID") -> List[Dict[str, Any]]:
        """
        Lists Google Cloud projects under a specific parent (organization or folder).
        """
        if not self.rm_client:
            logger.error("Resource Manager client is not initialized.")
            return []
            
        try:
            request = resourcemanager_v3.SearchProjectsRequest(
                query=f"parent:{parent}"
            )
            page_result = self.rm_client.search_projects(request=request)
            
            projects = []
            for project in page_result:
                projects.append({
                    "project_id": project.project_id,
                    "display_name": project.display_name,
                    "state": project.state.name,
                    "create_time": project.create_time.isoformat() if project.create_time else None
                })
            
            logger.info(f"Found {len(projects)} projects under {parent}")
            return projects
            
        except GoogleAPIError as e:
            logger.error(f"Google API Error while listing projects: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error listing projects: {e}")
            return []

    def verify_firebase_connection(self) -> bool:
        """
        Verifies the Firebase connection by attempting to access Firestore.
        """
        if not self.firebase_app:
            logger.error("Firebase app is not initialized.")
            return False
            
        try:
            db = firestore.client()
            # Perform a lightweight operation to verify connectivity
            collections = list(db.collections(limit=1))
            logger.info("Successfully verified Firebase Firestore connection.")
            return True
        except Exception as e:
            logger.error(f"Failed to verify Firebase connection: {e}")
            return False

    def get_firebase_users(self, max_results: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieves a list of Firebase Auth users.
        """
        if not self.firebase_app:
            logger.error("Firebase app is not initialized.")
            return []
            
        try:
            page = auth.list_users(max_results=max_results)
            users = []
            for user in page.users:
                users.append({
                    "uid": user.uid,
                    "email": user.email,
                    "display_name": user.display_name,
                    "disabled": user.disabled
                })
            logger.info(f"Successfully retrieved {len(users)} Firebase users.")
            return users
        except Exception as e:
            logger.error(f"Failed to retrieve Firebase users: {e}")
            return []

if __name__ == "__main__":
    # Example usage
    logger.info("Starting Cloud Architect Core validation...")
    
    # Initialize the core architect
    architect = CloudArchitectCore()
    
    # Verify Firebase
    architect.verify_firebase_connection()
    
    # Note: To run list_gcp_projects, you need the correct parent ID and permissions.
    # projects = architect.list_gcp_projects("organizations/1234567890")
    # print(f"Projects: {projects}")
    
    logger.info("Cloud Architect Core initialization complete.")
