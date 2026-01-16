import os
import re
import json
import asyncio
from dotenv import load_dotenv

from livekit.agents import AgentSession, Agent, JobContext, WorkerOptions, cli
from livekit.agents.voice import room_io
from livekit.plugins import silero, deepgram, elevenlabs, turn_detector
from livekit.agents.llm import inference

load_dotenv()

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
        reliable=True,
    )


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=room_io.AutoSubscribe.AUDIO_ONLY)

    session_id = ctx.room.name
    print("🎙 Interview session:", session_id)

    # Create an AgentSession, specifying your plugins
    session = AgentSession(
        stt=deepgram.STT(),             # Deepgram speech-to-text
        tts=elevenlabs.TTS(),           # ElevenLabs text-to-speech
        vad=silero.VAD.load(),          # Silero Voice Activity Detection
        turn_detection=turn_detector.MultilingualModel(),  # Optional turn detector
        llm=inference.GenerativeModel(  # Use an LLM like Google Gemini
            model="gemini-2.5-flash",
            api_key=os.environ["GEMINI_API_KEY"],
        ),
    )

    # Start the session with the agent logic
    await session.start(
        room=ctx.room,
        agent=Agent(instructions=SYSTEM_PROMPT),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=None
            ),
            text_output=room_io.TextOutputOptions(sync_transcription=True),
        ),
    )

    # Ask the first question
    await session.generate_reply(f"Ask the candidate: {QUESTION}")
    await publish(ctx.room, {
        "type": "transcript",
        "speaker": "AGENT",
        "text": QUESTION,
        "final": True,
    })

    # Main loop: as user talks, generate follow-ups
    async for event in session.listen():
        if hasattr(event, "text"):
            text = event.text.strip()
            print("👤 Candidate:", text)

            await publish(ctx.room, {
                "type": "transcript",
                "speaker": "CANDIDATE",
                "text": text,
                "final": True,
            })

            if re.search(r"end (the )?interview|i'?m done", text, re.I):
                goodbye = "Alright, ending the interview. Thank you."
                await session.generate_reply(goodbye)
                await publish(ctx.room, {
                    "type": "transcript",
                    "speaker": "AGENT",
                    "text": goodbye,
                    "final": True,
                })
                await publish(ctx.room, {
                    "type": "control",
                    "action": "INTERVIEW_ENDED",
                })
                break

    await ctx.shutdown()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="interviewer-agent"
        )
    )
