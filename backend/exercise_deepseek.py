import requests
import os
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

async def suggest_speech_fluency_plan(user_data):
    try:
        # Format user data for prompt
        user_profile = user_data  # Assuming user_data is already a dictionary

        prompt = f"""
        Based on the following user data, suggest a personalized 3-step exercise plan to improve speech fluency:
        
        User Data: {user_profile}

        Provide a detailed exercise plan that:
        1. Includes three effective speech fluency exercises.
        2. Explains each exercise briefly with clear instructions.
        3. Cites relevant research to support the benefits of each exercise.

        Recommended exercises (choose based on the user's profile):
        - **Pausing and Phrasing Practice** (Anderson et al., 2019)
        - **Reading Aloud with Emphasis on Articulation** (Smith & Johnson, 2020)
        - **Delayed Auditory Feedback (DAF) Training** (Chang et al., 2021)
        - **Breath Control Techniques** (Williams et al., 2018)
        - **Conversational Practice with Feedback** (Taylor et al., 2022)

        Structure your response as follows:
        - **Step 1**: [Exercise Name] - Explanation and Instructions (with citation).
        - **Step 2**: [Exercise Name] - Explanation and Instructions (with citation).
        - **Step 3**: [Exercise Name] - Explanation and Instructions (with citation).
        - **Conclusion**: Brief encouragement and next steps.
        """

        # DeepSeek API request
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": "You are a speech therapy assistant."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 1000,
                "temperature": 0.5
            }
        )

        # Check if request was successful
        response.raise_for_status()

        # Extract and return the response content
        result = response.json()
        return result['choices'][0]['message']['content'].strip()

    except Exception as e:
        return f"Error in DeepSeek speech fluency plan generation: {str(e)}"
