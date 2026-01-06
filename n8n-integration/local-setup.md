# Local n8n Setup Guide (Windows)

Since you have Docker installed, that is the recommended way to run n8n locally. It keeps everything isolated and reliable.

## Method 1: The Robust Way (Docker)
1. Open your terminal (PowerShell or Command Prompt).
2. Run the following command:
   ```powershell
   docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
   ```
3. Once it's running, open your browser and go to: `http://localhost:5678`

## Method 2: The Quick Way (npm)
If you don't want to use Docker, you can run it via npm:
1. Run this command:
   ```powershell
   npx n8n
   ```
2. Open your browser to: `http://localhost:5678`

---

## After n8n is started:
1. **Create an Account**: n8n will ask you to set up an initial admin account (this stays on your computer).
2. **Import My Workflow**:
   * Click **Workflows** on the left.
   * Click the **Add Workflow** (or three dots) -> **Import from File**.
   * Select the file I created for you: [job-extractor-v1.json](file:///e:/careercampuss/careercompass-ug/n8n-integration/job-extractor-v1.json).
3. **Configure Credentials**:
   * You will need to add your **OpenAI API Key** and **Supabase URL/Key** in the "Credentials" section of n8n so the workflow can talk to your services.
4. **Active the Workflow**: Toggle the "Active" switch in the top right.

## Connecting to your local code:
If you want n8n to reach your local database or local files, ensure you use `host.docker.internal` instead of `localhost` if you chose Method 1 (Docker).
