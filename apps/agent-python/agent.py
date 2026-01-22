# apps/agent-python/agent.py
import asyncio
import os
import json
import aiohttp
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
    Agent,
    AgentSession,
)
from livekit.plugins import deepgram, openai, silero, cartesia

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")

SYSTEM_PROMPT = """
You are a senior software engineer conducting a real coding interview.

You have REAL-TIME ACCESS to the candidate's code editor. Reference their code specifically when relevant.

Interview Flow:
- Start with the given problem
- Ask follow-up questions about their approach
- Reference their actual code: "I see you're using a loop here..."
- Challenge edge cases
- When ready to move on, say EXACTLY: "NEXT_PROBLEM"
- Do NOT give solutions
- Be concise and natural

Important:
- The candidate's current code is injected into your context automatically
- Comment on their actual implementation, not hypotheticals
- If they ask you to review code, reference specific lines
"""

QUESTION = (
    "Given an array of integers, return indices of two numbers "
    "that add up to a target."
)


async def fetch_current_code(session_id: str) -> str:
    """Fetch the latest code from backend"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}/api/session/{session_id}/code") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("code", "")
    except Exception as e:
        print(f"⚠️ Failed to fetch code: {e}")
    return ""


async def entrypoint(ctx: JobContext):
    print("🧠 Agent entrypoint called")
    print("🔗 Connecting to LiveKit room...")

    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

    print("✅ Connected to LiveKit")
    print("🏠 Room name:", ctx.room.name)

    session_id = ctx.room.name
    print("🎯 Interview session:", session_id)

    last_code = ""
    async def publish_transcript(text: str, speaker="AGENT"):
        payload = {
            "type": "transcript",
            "speaker": speaker,
            "text": text,
            "final": True,
        }
        encoded = json.dumps(payload).encode("utf-8")
        print("📤 Publishing transcript:", payload)
        await ctx.room.local_participant.publish_data(encoded, reliable=True)

    async def save_transcript(speaker: str, text: str):
        try:
            async with aiohttp.ClientSession() as http_session:
                async with http_session.post(
                    f"{BACKEND_URL}/api/session/{session_id}/transcript",
                    json={"speaker": speaker, "text": text},
                    headers={"Content-Type": "application/json"}
                ) as resp:
                    if resp.status == 200:
                        print(f"✅ Transcript saved: {speaker}")
                    else:
                        print(f"⚠️ Failed to save transcript: {resp.status}")
        except Exception as e:
            print(f"❌ Error saving transcript: {e}")

    # Create AgentSession (the new API)
    print("🔧 Creating AgentSession...")
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=openai.LLM(
            model="llama-3.1-8b-instant",
            base_url="https://api.groq.com/openai/v1",
            api_key=os.getenv("GROQ_API_KEY"),
        ),
        tts=cartesia.TTS(),  # Changed to OpenAI TTS
    )
    print("✅ AgentSession created")

    # Create the agent with instructions
    print("🔧 Creating Agent...")
    agent = Agent(instructions=SYSTEM_PROMPT)
    print("✅ Agent created")

    # Monitor chat for transcripts
    async def monitor_chat():
        last_len = 0
        while True:
            try:
                await asyncio.sleep(0.5)
                
                # Access the agent's chat context through the session
                if hasattr(session, '_agent') and hasattr(session._agent, 'chat_ctx'):
                    chat_ctx = session._agent.chat_ctx
                    current_len = len(chat_ctx.messages) if hasattr(chat_ctx, 'messages') else 0
                    
                    if current_len > last_len:
                        new_msg = chat_ctx.messages[-1]
                        
                        if new_msg.role == "user":
                            print(f"👤 Candidate: {new_msg.content[:50]}...")
                            await save_transcript("CANDIDATE", new_msg.content)
                        elif new_msg.role == "assistant":
                            print(f"🗣 Agent: {new_msg.content[:50]}...")
                            await save_transcript("AGENT", new_msg.content)
                            
                            if "NEXT_PROBLEM" in new_msg.content.upper():
                                asyncio.create_task(handle_next_problem())
                        
                        last_len = current_len
            except Exception as e:
                # Silently handle errors during monitoring
                pass
    
    asyncio.create_task(monitor_chat())

    # Code injection
    async def inject_code_context():
        nonlocal last_code
        while True:
            try:
                await asyncio.sleep(5)
                code = await fetch_current_code(session_id)
                
                if code and len(code.strip()) > 30 and code != last_code:
                    last_code = code
                    print(f"💉 Injecting code ({len(code)} chars)")
                    
                    # Inject into the session's agent chat context
                    if hasattr(session, '_agent') and hasattr(session._agent, 'chat_ctx'):
                        session._agent.chat_ctx.messages.append(
                            llm.ChatMessage(
                                role="system",
                                content=f"[CANDIDATE'S CURRENT CODE]\n```python\n{code}\n```"
                            )
                        )

            except Exception as e:
                print(f"⚠️ Code injection error: {e}")
    
    asyncio.create_task(inject_code_context())

    async def handle_next_problem():
        print("🔄 NEXT_PROBLEM detected")
        try:
            async with aiohttp.ClientSession() as http_session:
                async with http_session.get(
                    f"{BACKEND_URL}/api/session/{session_id}/next-problem"
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("question"):
                            new_q = data["question"]
                            print(f"✅ Next question: {new_q[:50]}...")
                            
                            await ctx.room.local_participant.publish_data(
                                json.dumps({
                                    "type": "question_update",
                                    "question": new_q
                                }).encode("utf-8"),
                                reliable=True
                            )
                            
                            # Say through session
                            await session.generate_reply(instructions=new_q)
                        else:
                            await session.generate_reply(instructions="Great job! We've completed all problems.")
        except Exception as e:
            print(f"❌ Next problem error: {e}")

    print("▶️ Starting session...")
    await session.start(room=ctx.room, agent=agent)

    await asyncio.sleep(1)

    print("🗣 Saying opening question...")

    # 1. Publish to frontend (UI)
    await publish_transcript(QUESTION)

    # 2. Speak it
    await session.generate_reply(instructions=f"Say this exactly: {QUESTION}")

    # 3. Save to backend store
    await save_transcript("AGENT", QUESTION)

    print("✅ Opening question delivered to UI + voice + backend")



if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="interviewer-agent"
        )
    )