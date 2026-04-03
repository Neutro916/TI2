import os
import sys
import logging
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - DEPLOY_AGENT - %(levelname)s - %(message)s'
)
logger = logging.getLogger("DeployAgent")

try:
    from google.cloud import run_v2
    from google.api_core.exceptions import GoogleAPIError
    from google.api_core.operation import Operation
except ImportError as e:
    logger.error(f"Failed to import required libraries: {e}")
    logger.info("Please install required packages: pip install google-cloud-run")
    sys.exit(1)

class DeployAgent:
    """
    Handles deployments to Google Cloud Run.
    Provides real integration with the Cloud Run Admin API.
    """
    def __init__(self, project_id: Optional[str] = None, location: str = "us-central1"):
        self.project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = location
        self.run_client = self._initialize_run_client()

    def _initialize_run_client(self) -> Optional[run_v2.ServicesClient]:
        """Initializes the Google Cloud Run Services client."""
        try:
            client = run_v2.ServicesClient()
            logger.info("Successfully initialized Google Cloud Run Services client.")
            return client
        except Exception as e:
            logger.error(f"Failed to initialize Cloud Run client: {e}")
            return None

    def get_service_status(self, service_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves the status of a specific Cloud Run service.
        """
        if not self.run_client:
            logger.error("Cloud Run client is not initialized.")
            return None

        try:
            name = f"projects/{self.project_id}/locations/{self.location}/services/{service_name}"
            request = run_v2.GetServiceRequest(name=name)
            
            service = self.run_client.get_service(request=request)
            
            status = {
                "name": service.name,
                "uri": service.uri,
                "latest_ready_revision": service.latest_ready_revision,
                "latest_created_revision": service.latest_created_revision,
                "conditions": [{"type": c.type_, "state": c.state.name, "message": c.message} for c in service.conditions]
            }
            
            logger.info(f"Successfully retrieved status for service: {service_name}")
            return status
            
        except GoogleAPIError as e:
            logger.error(f"Google API Error retrieving service status: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error retrieving service status: {e}")
            return None

    def deploy_image(self, service_name: str, image_url: str, env_vars: Optional[Dict[str, str]] = None) -> bool:
        """
        Deploys a container image to a Cloud Run service.
        """
        if not self.run_client:
            logger.error("Cloud Run client is not initialized.")
            return False

        try:
            name = f"projects/{self.project_id}/locations/{self.location}/services/{service_name}"
            parent = f"projects/{self.project_id}/locations/{self.location}"
            
            # Prepare environment variables
            env = []
            if env_vars:
                for k, v in env_vars.items():
                    env.append(run_v2.EnvVar(name=k, value=v))
            
            # Define the service configuration
            service = run_v2.Service(
                template=run_v2.RevisionTemplate(
                    containers=[
                        run_v2.Container(
                            image=image_url,
                            env=env
                        )
                    ]
                )
            )
            
            logger.info(f"Initiating deployment of {image_url} to {service_name}...")
            
            # Check if service exists to determine create vs update
            try:
                self.run_client.get_service(name=name)
                # Service exists, update it
                service.name = name
                request = run_v2.UpdateServiceRequest(service=service)
                operation = self.run_client.update_service(request=request)
                logger.info("Updating existing service...")
            except Exception:
                # Service doesn't exist, create it
                request = run_v2.CreateServiceRequest(
                    parent=parent,
                    service_id=service_name,
                    service=service
                )
                operation = self.run_client.create_service(request=request)
                logger.info("Creating new service...")

            # Wait for the operation to complete
            logger.info("Waiting for deployment operation to complete...")
            response = operation.result()
            
            logger.info(f"Successfully deployed service {service_name}. URI: {response.uri}")
            return True
            
        except GoogleAPIError as e:
            logger.error(f"Google API Error during deployment: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during deployment: {e}")
            return False

if __name__ == "__main__":
    # Example usage
    logger.info("Starting Deploy Agent validation...")
    
    agent = DeployAgent()
    
    # Note: To run actual deployments, you need a valid image URL and permissions.
    # service_name = "my-test-service"
    # image_url = "gcr.io/my-project/my-image:latest"
    # 
    # status = agent.get_service_status(service_name)
    # if status:
    #     print(f"Service Status: {status}")
    # else:
    #     agent.deploy_image(service_name, image_url)
    
    logger.info("Deploy Agent initialization complete.")
