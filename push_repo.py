"""
VehicleGPT — GitHub Push Helper (Pure-Python Dulwich Transport)
Bypasses Windows Application Control DLL limitations by using standard-library SSL.
"""

import sys
import os
import dulwich.porcelain as porcelain

REPO_PATH = "."
REMOTE_REPO = "https://github.com/Johnzec09/vehicleGPT.git"

def push_to_github(token: str, username: str = "Johnzec09"):
    # Strip whitespace / quotes
    token = token.strip().strip("'\"")
    auth_url = f"https://{username}:{token}@github.com/Johnzec09/vehicleGPT.git"
    
    print(f"Connecting to GitHub ({REMOTE_REPO})...")
    try:
        porcelain.push(
            REPO_PATH,
            auth_url,
            "refs/heads/main:refs/heads/main"
        )
        print("SUCCESS! Successfully pushed VehicleGPT repository to https://github.com/Johnzec09/vehicleGPT")
        return True
    except Exception as e:
        print(f"Error during push: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pat = sys.argv[1]
        push_to_github(pat)
    else:
        pat = os.environ.get("GITHUB_TOKEN") or input("Enter your GitHub Personal Access Token (PAT): ")
        if pat:
            push_to_github(pat)
        else:
            print("No token provided.")
