#!/usr/bin/env python3

import os
import time
from pathlib import Path

from playwright.sync_api import Page, Playwright, sync_playwright


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:18085")
CHROME_PATH = os.environ.get(
    "CHROME_PATH",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
)
DESKTOP_SCREENSHOT = Path(os.environ.get("DESKTOP_SCREENSHOT", "/tmp/task-demo-desktop.png"))
MOBILE_SCREENSHOT = Path(os.environ.get("MOBILE_SCREENSHOT", "/tmp/task-demo-mobile.png"))


def assert_no_horizontal_overflow(page: Page, label: str) -> None:
    dimensions = page.evaluate(
        """() => ({
            viewport: document.documentElement.clientWidth,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
        })"""
    )
    assert dimensions["document"] <= dimensions["viewport"], (
        f"{label} document overflows horizontally: {dimensions}"
    )
    assert dimensions["body"] <= dimensions["viewport"], (
        f"{label} body overflows horizontally: {dimensions}"
    )


def exercise_ui(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=CHROME_PATH,
    )
    marker = f"e2e-{int(time.time())}"
    edited_title = f"{marker}-" + ("rollout" * 12)
    created_id = None
    console_errors: list[str] = []

    try:
        desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        page = desktop.new_page()
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")

        title_input = page.locator('[data-create-form] input[name="title"]')
        description_input = page.locator('[data-create-form] input[name="description"]')
        title_input.fill(marker)
        description_input.fill("Created by the Kubernetes UI end-to-end test.")
        page.get_by_role("button", name="Add task").click()

        created_item = page.locator("[data-task-id]").filter(has=page.get_by_role("heading", name=marker))
        created_item.wait_for()
        created_id = created_item.get_attribute("data-task-id")
        assert page.evaluate("document.activeElement?.name") == "title", (
            "Create form title input did not regain focus"
        )

        created_item.get_by_role("button", name=f"Edit task: {marker}").click()
        edit_dialog = page.locator("[data-edit-dialog]")
        assert edit_dialog.get_attribute("open") is not None
        assert page.evaluate("document.activeElement?.name") == "title"
        edit_dialog.locator('input[name="title"]').fill(edited_title)
        edit_dialog.locator('textarea[name="description"]').fill(
            "Updated through the edit dialog before rollout status changes."
        )
        edit_dialog.get_by_role("button", name="Save changes").click()

        edited_item = page.locator("[data-task-id]").filter(
            has=page.get_by_role("heading", name=edited_title)
        )
        edited_item.wait_for()
        edited_item.get_by_role("button", name=f"Complete task: {edited_title}").click()
        page.get_by_role("button", name="Completed").click()
        assert page.get_by_role("button", name="Completed").get_attribute("aria-pressed") == "true"
        edited_item = page.locator("[data-task-id]").filter(
            has=page.get_by_role("heading", name=edited_title)
        )
        edited_item.wait_for()
        assert edited_item.get_attribute("data-status") == "completed"

        edited_item.get_by_role("button", name=f"Reopen task: {edited_title}").click()
        page.get_by_role("button", name="Pending").click()
        edited_item = page.locator("[data-task-id]").filter(
            has=page.get_by_role("heading", name=edited_title)
        )
        edited_item.wait_for()
        assert edited_item.get_attribute("data-status") == "pending"

        page.get_by_role("button", name="All").click()
        assert_no_horizontal_overflow(page, "desktop")
        page.screenshot(path=str(DESKTOP_SCREENSHOT), full_page=True)
        desktop.close()

        mobile = browser.new_context(viewport={"width": 390, "height": 844})
        mobile_page = mobile.new_page()
        mobile_page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        mobile_page.goto(BASE_URL)
        mobile_page.wait_for_load_state("networkidle")
        mobile_item = mobile_page.locator(f'[data-task-id="{created_id}"]')
        mobile_item.wait_for()
        assert_no_horizontal_overflow(mobile_page, "mobile")
        box = mobile_item.bounding_box()
        assert box is not None
        assert box["x"] >= 0 and box["x"] + box["width"] <= 390
        mobile_page.screenshot(path=str(MOBILE_SCREENSHOT), full_page=True)

        mobile_item.get_by_role("button", name=f"Delete task: {edited_title}").click()
        delete_dialog = mobile_page.locator("[data-delete-dialog]")
        assert delete_dialog.get_attribute("open") is not None
        assert delete_dialog.locator("[data-delete-title]").text_content() == edited_title
        delete_dialog.get_by_role("button", name="Delete task").click()
        mobile_page.locator(f'[data-task-id="{created_id}"]').wait_for(state="detached")
        created_id = None
        mobile.close()

        assert not console_errors, f"Browser console errors: {console_errors}"
    finally:
        if created_id is not None:
            request = playwright.request.new_context(base_url=BASE_URL)
            request.delete(f"/api/v1/tasks/{created_id}")
            request.dispose()
        browser.close()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        exercise_ui(playwright)
    print(f"UI end-to-end verification passed for {BASE_URL}")
    print(f"Desktop screenshot: {DESKTOP_SCREENSHOT}")
    print(f"Mobile screenshot: {MOBILE_SCREENSHOT}")
