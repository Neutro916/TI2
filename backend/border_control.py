import os
import sys
import json
import logging
import socket
import urllib.request
from typing import Dict, Any, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - BORDER_CONTROL - %(levelname)s - %(message)s'
)
logger = logging.getLogger("BorderControl")

try:
    from google.cloud import resourcemanager_v3
    from google.auth import default
    from google.auth.exceptions import DefaultCredentialsError
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError as e:
    logger.error(f"Failed to import required libraries: {e}")
    logger.info("Please install required packages: pip install google-cloud-resource-manager firebase-admin google-auth")
    sys.exit(1)

class BorderControl:
    """
    Validates the local environment state against the live Google Cloud and Firebase state.
    Acts as a gatekeeper before allowing deployments or syncs.
    """
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.local_state = self._gather_local_state()
        self.cloud_state = {}
        
    def _gather_local_state(self) -> Dict[str, Any]:
        """Gathers information about the local environment."""
        state = {
            "hostname": socket.gethostname(),
            "python_version": sys.version,
            "project_id_env": self.project_id,
            "has_google_application_credentials": "GOOGLE_APPLICATION_CREDENTIALS" in os.environ,
            "cwd": os.getcwd()
        }
        logger.info(f"Local state gathered: {json.dumps(state, indent=2)}")
        return state

    def check_network_connectivity(self) -> bool:
        """Verifies basic outbound connectivity to Google APIs."""
        try:
            urllib.request.urlopen("https://www.googleapis.com/discovery/v1/apis", timeout=5)
            logger.info("Network connectivity to Google APIs verified.")
            return True
        except Exception as e:
            logger.error(f"Failed to reach Google APIs. Network might be down or blocked: {e}")
            return False

    def verify_gcp_credentials(self) -> Tuple[bool, str]:
        """Verifies that valid Google Cloud credentials exist and can be loaded."""
        try:
            credentials, project = default()
            self.cloud_state["auth_project"] = project
            logger.info(f"Successfully loaded GCP credentials for project: {project}")
            return True, project
        except DefaultCredentialsError as e:
            logger.error(f"Failed to load Default GCP Credentials: {e}")
            return False, ""
        except Exception as e:
            logger.error(f"Unexpected error loading GCP credentials: {e}")
            return False, ""

    def verify_resource_manager_access(self, project_id: str) -> bool:
        """Verifies access to the specific GCP project via Resource Manager."""
        if not project_id:
            logger.error("No project ID provided for Resource Manager verification.")
            return False
            
        try:
            client = resourcemanager_v3.ProjectsClient()
            name = f"projects/{project_id}"
            project = client.get_project(name=name)
            
            self.cloud_state["project_state"] = project.state.name
            logger.info(f"Successfully verified access to project {project_id}. State: {project.state.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to access project {project_id} via Resource Manager: {e}")
            return False

    def verify_firebase_live_state(self, project_id: str) -> bool:
        """Verifies the live state of the Firebase project."""
        if not project_id:
            logger.error("No project ID provided for Firebase verification.")
            return False
            
        try:
            if not firebase_admin._apps:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {'projectId': project_id})
                
            db = firestore.client()
            # Attempt to read a specific 'system/health' document or just list collections
            collections = list(db.collections(limit=1))
            self.cloud_state["firestore_accessible"] = True
            logger.info(f"Successfully verified live Firebase Firestore state for project {project_id}.")
            return True
        except Exception as e:
            logger.error(f"Failed to verify live Firebase state: {e}")
            self.cloud_state["firestore_accessible"] = False
            return False

    def run_full_audit(self) -> bool:
        """Runs the complete border control audit."""
        logger.info("Starting Border Control Audit...")
        
        if not self.check_network_connectivity():
            logger.error("Audit Failed: No network connectivity.")
            return False
            
        has_creds, auth_project = self.verify_gcp_credentials()
        if not has_creds:
            logger.error("Audit Failed: Invalid GCP credentials.")
            return False
            
        target_project = self.project_id or auth_project
        if not target_project:
            logger.error("Audit Failed: Could not determine target GCP project.")
            return False
            
        rm_access = self.verify_resource_manager_access(target_project)
        if not rm_access:
            logger.warning("Resource Manager access failed. This might be a permissions issue.")
            
        fb_access = self.verify_firebase_live_state(target_project)
        if not fb_access:
            logger.warning("Firebase access failed. Ensure Firestore is initialized and permissions are correct.")
            
        # Determine overall success
        success = has_creds and (rm_access or fb_access)
        
        if success:
            logger.info("Border Control Audit Passed. Local state matches required cloud access.")
        else:
            logger.error("Border Control Audit Failed. Please check the logs above.")
            
        return success

if __name__ == "__main__":
    gatekeeper = BorderControl()
    sys.exit(0 if gatekeeper.run_full_audit() else 1)
