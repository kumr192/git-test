import streamlit as st
from dotenv import load_dotenv
load_dotenv()

from agents import run_master_agent

st.set_page_config(page_title="Multi-Agent Assistant", page_icon="🤖", layout="centered")

st.title("🤖 Multi-Agent Assistant")
st.caption("Ask about weather, currency, or both — the right agents will be called automatically.")

if "history" not in st.session_state:
    st.session_state.history = []

with st.form("query_form", clear_on_submit=True):
    user_input = st.text_input("Your question", placeholder="e.g. What's the weather in Tokyo and how much is $500 in yen?")
    submitted = st.form_submit_button("Ask", use_container_width=True)

if submitted and user_input.strip():
    with st.spinner("Thinking..."):
        try:
            answer, agents_used = run_master_agent(user_input.strip())
            st.session_state.history.append({
                "question": user_input.strip(),
                "agents": agents_used,
                "answer": answer,
            })
        except Exception as e:
            st.error(f"Error: {e}")

for entry in reversed(st.session_state.history):
    with st.container(border=True):
        st.markdown(f"**You:** {entry['question']}")
        if entry["agents"]:
            agent_tags = " · ".join(f"`{a}`" for a in entry["agents"])
            st.markdown(f"**Agents used:** {agent_tags}")
        st.markdown(entry["answer"])
