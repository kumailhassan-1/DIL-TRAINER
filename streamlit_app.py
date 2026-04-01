import streamlit as st
import streamlit.components.v1 as components

LIVE_SITE_URL = "https://check-topaz-five.vercel.app"

st.set_page_config(
    page_title="DIL Daily Training",
    page_icon="D",
    layout="wide",
)

st.title("DIL Daily Training")
st.caption("Streamlit wrapper for the live DIL website")

url = st.text_input("Website URL", value=LIVE_SITE_URL)

if not url.strip():
    st.warning("Enter a valid URL to load the site.")
else:
    components.iframe(url.strip(), height=950, scrolling=True)
    st.markdown(f"Open directly: [{url.strip()}]({url.strip()})")
