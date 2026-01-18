# import os
# import re
# import json
# import asyncio
# from dotenv import load_dotenv

# from livekit.agents import AgentSession, Agent, JobContext, WorkerOptions, cli
# from livekit.agents.voice import room_io
# from livekit.plugins import silero, deepgram, elevenlabs, turn_detector
# from livekit.agents.llm import inference

# load_dotenv()

# SYSTEM_PROMPT = """
# You are a senior software engineer conducting a real coding interview.

# Rules:
# - Ask follow-up questions
# - Challenge edge cases
# - Ask complexity questions
# - Do NOT give solutions
# - Be concise and natural
# """

# QUESTION = (
#     "Given an array of integers, return indices of two numbers "
#     "that add up to a target."
# )


# async def publish(room, payload):
#     await room.local_participant.publish_data(
#         json.dumps(payload).encode("utf-8"),
#         reliable=True,
#     )


# async def entrypoint(ctx: JobContext):
#     await ctx.connect(auto_subscribe=room_io.AutoSubscribe.AUDIO_ONLY)

#     session_id = ctx.room.name
#     print("🎙 Interview session:", session_id)

#     # Create an AgentSession, specifying your plugins
#     session = AgentSession(
#         stt=deepgram.STT(),             # Deepgram speech-to-text
#         tts=elevenlabs.TTS(),           # ElevenLabs text-to-speech
#         vad=silero.VAD.load(),          # Silero Voice Activity Detection
#         turn_detection=turn_detector.MultilingualModel(),  # Optional turn detector
#         llm=inference.GenerativeModel(  # Use an LLM like Google Gemini
#             model="gemini-2.5-flash",
#             api_key=os.environ["GEMINI_API_KEY"],
#         ),
#     )

#     # Start the session with the agent logic
#     await session.start(
#         room=ctx.room,
#         agent=Agent(instructions=SYSTEM_PROMPT),
#         room_options=room_io.RoomOptions(
#             audio_input=room_io.AudioInputOptions(
#                 noise_cancellation=None
#             ),
#             text_output=room_io.TextOutputOptions(sync_transcription=True),
#         ),
#     )

#     # Ask the first question
#     await session.generate_reply(f"Ask the candidate: {QUESTION}")
#     await publish(ctx.room, {
#         "type": "transcript",
#         "speaker": "AGENT",
#         "text": QUESTION,
#         "final": True,
#     })

#     # Main loop: as user talks, generate follow-ups
#     async for event in session.listen():
#         if hasattr(event, "text"):
#             text = event.text.strip()
#             print("👤 Candidate:", text)

#             await publish(ctx.room, {
#                 "type": "transcript",
#                 "speaker": "CANDIDATE",
#                 "text": text,
#                 "final": True,
#             })

#             if re.search(r"end (the )?interview|i'?m done", text, re.I):
#                 goodbye = "Alright, ending the interview. Thank you."
#                 await session.generate_reply(goodbye)
#                 await publish(ctx.room, {
#                     "type": "transcript",
#                     "speaker": "AGENT",
#                     "text": goodbye,
#                     "final": True,
#                 })
#                 await publish(ctx.room, {
#                     "type": "control",
#                     "action": "INTERVIEW_ENDED",
#                 })
#                 break

#     await ctx.shutdown()


# if __name__ == "__main__":
#     cli.run_app(
#         WorkerOptions(
#             entrypoint_fnc=entrypoint,
#             agent_name="interviewer-agent"
#         )
#     )

# apps/agent-python/agent.py
# import asyncio
# import os
# import re
# import json
# from dotenv import load_dotenv

# from livekit.agents import (
#     AutoSubscribe,
#     JobContext,
#     WorkerOptions,
#     cli,
#     Agent
# )

# import google.generativeai as genai

# # Load environment variables
# load_dotenv()

# # Configure Gemini
# genai.configure(api_key=os.environ["GEMINI_API_KEY"])


# SYSTEM_PROMPT = """
# You are a senior software engineer conducting a real coding interview.

# Rules:
# - Ask follow-up questions
# - Challenge edge cases
# - Ask complexity questions
# - Do NOT give solutions
# - Be concise and natural
# """

# QUESTION = (
#     "Given an array of integers, return indices of two numbers "
#     "that add up to a target."
# )


# async def publish(room, payload):
#     await room.local_participant.publish_data(
#         json.dumps(payload).encode("utf-8"),
#         reliable=True
#     )


# async def entrypoint(ctx: JobContext):
#     print("🧠 Agent entrypoint called")
#     print("🔗 Connecting to LiveKit room...")

#     # IMPORTANT: use AUDIO_ONLY, not ALL
#     await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

#     print("✅ Connected to LiveKit")
#     print("🏠 Room name:", ctx.room.name)

#     session_id = ctx.room.name
#     print("🎯 Interview session:", session_id)

#     # Create agent WITHOUT system_prompt in constructor
#     agent = Agent(
#         vad="default",
#         stt="deepgram",
#         tts="elevenlabs",
#         llm="gemini",
#     )

#     # Set system prompt after creation (new API style)
#     agent.system_prompt = SYSTEM_PROMPT

#     print("🤖 Agent created, starting...")
#     agent.start(ctx.room)
#     print("▶️ Agent started")

#     # Ask opening question
#     print("🗣 Asking opening question")
#     await agent.say(QUESTION)

#     await publish(ctx.room, {
#         "type": "transcript",
#         "speaker": "AGENT",
#         "text": QUESTION,
#         "final": True
#     })
#     print("📤 Opening question published")

#     async for msg in agent.listen():
#         print("🎧 Raw agent.listen message:", msg)

#         text = msg.text.strip()
#         print("🗣 Candidate said:", text)

#         # Save candidate transcript
#         await publish(ctx.room, {
#             "type": "transcript",
#             "speaker": "CANDIDATE",
#             "text": text,
#             "final": True
#         })
#         print("📤 Candidate transcript published")

#         # End interview if user asks
#         if re.search(r"end (the )?interview|i'?m done", text, re.I):
#             print("🛑 Interview end detected")
#             closing = "Alright, ending the interview. Thank you."

#             await agent.say(closing)

#             await publish(ctx.room, {
#                 "type": "transcript",
#                 "speaker": "AGENT",
#                 "text": closing,
#                 "final": True
#             })

#             await publish(ctx.room, {
#                 "type": "control",
#                 "action": "INTERVIEW_ENDED"
#             })
#             break

#         # Ask Gemini for next interviewer question
#         print("🧠 Sending text to Gemini:", text)

#         response = genai.GenerativeModel(
#             "gemini-2.5-flash"
#         ).generate_content(
#             f"""
# You are an interviewer.
# Candidate said:
# {text}

# Ask a follow-up interview question.
# """
#         )

#         reply = response.text.strip()
#         print("🤖 Gemini replied:", reply)

#         await agent.say(reply)
#         print("🗣 Agent spoke reply")

#         await publish(ctx.room, {
#             "type": "transcript",
#             "speaker": "AGENT",
#             "text": reply,
#             "final": True
#         })
#         print("📤 Agent transcript published")

#     print("🔚 Shutting down job")
#     await ctx.shutdown()


# if __name__ == "__main__":
#     cli.run_app(
#         WorkerOptions(
#             entrypoint_fnc=entrypoint,
#             agent_name="interviewer-agent"
#         )
#     )

# apps/agent-python/agent.py
import asyncio
import os
import re
import json
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    Agent
)

import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.environ["GEMINI_API_KEY"])


SYSTEM_PROMPT = """
You are a senior software engineer conducting a real coding interview.

Rules:
- Ask follow-up questions
- Challenge edge cases
- Ask complexity questions
- Do NOT give solutions
- Be concise and natural
"""

QUESTION = (
    "Given an array of integers, return indices of two numbers "
    "that add up to a target."
)


async def publish(room, payload):
    await room.local_participant.publish_data(
        json.dumps(payload).encode("utf-8"),
        reliable=True
    )


async def entrypoint(ctx: JobContext):
    print("🧠 Agent entrypoint called")
    print("🔗 Connecting to LiveKit room...")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    print("✅ Connected to LiveKit")
    print("🏠 Room name:", ctx.room.name)

    session_id = ctx.room.name
    print("🎯 Interview session:", session_id)

    # Create agent
    agent = Agent(
        vad="default",
        stt="deepgram",
        tts="elevenlabs",
        llm="gemini",
        instructions=SYSTEM_PROMPT,
    )

    print("🤖 Agent created, starting session...")
    
    # Use async with for agent session
    async with agent.start_session(ctx.room) as session:
        print("▶️ Agent session started")

        # Ask opening question
        print("🗣 Asking opening question")
        await session.say(QUESTION)

        await publish(ctx.room, {
            "type": "transcript",
            "speaker": "AGENT",
            "text": QUESTION,
            "final": True
        })
        print("📤 Opening question published")

        async for msg in session.listen():
            print("🎧 Raw message:", msg)

            text = msg.text.strip()
            print("🗣 Candidate said:", text)

            await publish(ctx.room, {
                "type": "transcript",
                "speaker": "CANDIDATE",
                "text": text,
                "final": True
            })

            if re.search(r"end (the )?interview|i'?m done", text, re.I):
                print("🛑 Interview end detected")
                closing = "Alright, ending the interview. Thank you."

                await session.say(closing)

                await publish(ctx.room, {
                    "type": "transcript",
                    "speaker": "AGENT",
                    "text": closing,
                    "final": True
                })

                await publish(ctx.room, {
                    "type": "control",
                    "action": "INTERVIEW_ENDED"
                })
                break

            print("🧠 Sending to Gemini:", text)

            response = genai.GenerativeModel("gemini-2.5-flash").generate_content(
                f"You are an interviewer. Candidate said: {text}\n\nAsk a follow-up interview question."
            )

            reply = response.text.strip()
            print("🤖 Gemini replied:", reply)

            await session.say(reply)

            await publish(ctx.room, {
                "type": "transcript",
                "speaker": "AGENT",
                "text": reply,
                "final": True
            })

    print("🔚 Shutting down")
    await ctx.shutdown()
    
if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="interviewer-agent"
        )
    )