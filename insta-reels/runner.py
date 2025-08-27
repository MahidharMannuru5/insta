import asyncio
import json
import os
import subprocess
from datetime import datetime
import httpx
from playwright.async_api import async_playwright

# CONFIG
REEL_JSON = r"C:\Users\mahid\Desktop\instareel\insta-reels\src\components\reels.json"
DOWNLOAD_DIR = r"C:\Users\mahid\Desktop\instareel\insta-reels\public\media"
REPO_RAW_BASE = "https://raw.githubusercontent.com/MahidharMannuru5/insta/main/insta-reels/public/media"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
    "Range": "bytes=0-"
}

os.makedirs(os.path.dirname(REEL_JSON), exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


async def extract_public_media_url(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=HEADERS["User-Agent"])
        page = await context.new_page()

        try:
            print(f"🌐 Visiting: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(3000)

            video = await page.query_selector("video")
            if video:
                video_url = await video.get_attribute("src")
                return video_url, "video"

            img = await page.query_selector("img[decoding='auto']")
            if img:
                img_url = await img.get_attribute("src")
                return img_url, "image"

        except Exception as e:
            print(f"❌ Failed to fetch media: {e}")
        finally:
            await context.close()
            await browser.close()

    return None, None


def download_bytes(url):
    print(f"⬇️ Downloading from {url}")
    try:
        with httpx.stream("GET", url, headers=HEADERS, follow_redirects=True, timeout=60.0, verify=False) as r:
            content_type = r.headers.get("content-type", "")
            content = b"".join([chunk for chunk in r.iter_bytes()])
        return content, content_type
    except httpx.HTTPError as e:
        print("❌ Download failed:", e)
        return None, None


def save_file(content, content_type, filename_hint, timestamp):
    ext = ".mp4" if "video" in content_type else ".jpg"
    fname = f"{timestamp}-{filename_hint or 'downloaded'}{ext}".replace(":", "-")
    path = os.path.join(DOWNLOAD_DIR, fname)
    with open(path, "wb") as f:
        f.write(content)
    print(f"✅ Saved to {path}")
    return fname


def update_reel_json(caption, hashtags, filename, timestamp):
    data = []
    if os.path.exists(REEL_JSON):
        with open(REEL_JSON, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                print("⚠️ Invalid JSON. Reinitializing.")
                data = []

    new_id = max([d["id"] for d in data], default=0) + 1
    raw_url = f"{REPO_RAW_BASE}/{filename}?v={timestamp}"

    entry = {
        "id": new_id,
        "src": raw_url,
        "caption": caption,
        "hashtags": hashtags,
        "datetime": timestamp
    }

    data.insert(0, entry)

    with open(REEL_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"📁 Updated {REEL_JSON}.")


def git_commit_and_push(msg="Auto commit"):
    try:
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", msg], check=True)
        subprocess.run(["git", "push"], check=True)
        print("🚀 Changes pushed to GitHub.")
    except subprocess.CalledProcessError as e:
        print(f"❌ Git error: {e}")


async def main():
    print("🎬 Instagram Public Reel Downloader")
    print("-" * 40)
    url = input("Instagram URL: ").strip()
    caption = input("Caption: ").strip()
    hashtags_input = input("Hashtags (comma-separated): ").strip()
    filename_hint = input("Filename hint (optional): ").strip()
    timestamp = datetime.now().isoformat(timespec="seconds")

    media_url, media_type = await extract_public_media_url(url)
    if not media_url:
        print("❌ Could not extract media. Is the post public?")
        return

    content, content_type = download_bytes(media_url)
    if not content:
        print("❌ Media download failed.")
        return

    filename = save_file(content, content_type, filename_hint, timestamp.replace(":", "-"))
    update_reel_json(caption, [tag.strip() for tag in hashtags_input.split(",") if tag.strip()], filename, timestamp)
    git_commit_and_push(f"add: {filename} and update reels.json")


if __name__ == "__main__":
    asyncio.run(main())
