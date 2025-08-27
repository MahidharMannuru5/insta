import asyncio
import json
import os
import subprocess
from datetime import datetime
import httpx
from playwright.async_api import async_playwright

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
    "Range": "bytes=0-"
}
REEL_JSON = "reel.json"
DOWNLOAD_DIR = "downloads"
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


def save_file(content, content_type, filename_hint="downloaded_instagram"):
    ext = ".mp4" if "video" in content_type else ".jpg"
    filename = f"{filename_hint.strip() or 'downloaded'}{ext}"
    filepath = os.path.join(DOWNLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    print(f"✅ Saved to {filepath}")
    return filepath


def update_reel_json(entry):
    data = []
    if os.path.exists(REEL_JSON):
        with open(REEL_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)

    data.append(entry)

    with open(REEL_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"📁 Updated {REEL_JSON}.")


def git_commit_and_push(commit_msg="Auto update reel and media"):
    try:
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        subprocess.run(["git", "push"], check=True)
        print("🚀 Changes pushed to GitHub.")
    except subprocess.CalledProcessError as e:
        print(f"❌ Git error: {e}")


async def main():
    print("🎬 Instagram Public Reel Downloader")
    print("-" * 40)
    url = input("Instagram URL: ").strip()
    caption = input("Caption: ").strip()
    hashtags = input("Hashtags (comma-separated): ").strip()
    filename_hint = input("Filename hint (optional): ").strip()

    media_url, media_type = await extract_public_media_url(url)

    if not media_url:
        print("❌ Could not extract media. Is the post public?")
        return

    content, content_type = download_bytes(media_url)
    if not content:
        print("❌ Media download failed.")
        return

    saved_path = save_file(content, content_type, filename_hint)

    entry = {
        "url": url,
        "caption": caption,
        "hashtags": [tag.strip() for tag in hashtags.split(",") if tag.strip()],
        "media_path": saved_path,
        "timestamp": datetime.now().isoformat()
    }

    update_reel_json(entry)
    git_commit_and_push(f"add: {os.path.basename(saved_path)} + updated reel.json")


if __name__ == "__main__":
    asyncio.run(main())
