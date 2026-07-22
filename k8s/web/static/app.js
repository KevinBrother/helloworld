(() => {
  "use strict";

  const createForm = document.querySelector("[data-create-form]");
  const taskList = document.querySelector("[data-task-list]");
  const emptyState = document.querySelector("[data-empty-state]");
  const visibleCount = document.querySelector("[data-visible-count]");
  const totalCount = document.querySelector("[data-total-count]");
  const completedCount = document.querySelector("[data-completed-count]");
  const editDialog = document.querySelector("[data-edit-dialog]");
  const editForm = document.querySelector("[data-edit-form]");
  const deleteDialog = document.querySelector("[data-delete-dialog]");
  const deleteForm = document.querySelector("[data-delete-form]");
  const deleteTitle = document.querySelector("[data-delete-title]");
  const toastRegion = document.querySelector("[data-toast-region]");
  let activeFilter = "";
  let tasks = readInitialTasks();

  function readInitialTasks() {
    return Array.from(taskList.querySelectorAll("[data-task-id]")).map((element) => ({
      id: Number(element.dataset.taskId),
      title: element.querySelector("h3").textContent.trim(),
      description: element.querySelector(".task-copy > p")?.textContent.trim() || "",
      status: element.dataset.status,
      updatedAt: element.querySelector("time")?.dateTime || new Date().toISOString(),
    }));
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (response.status === 204) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error?.message || `Request failed with status ${response.status}`);
    }
    return payload.data;
  }

  async function refreshTasks() {
    tasks = await api("/api/v1/tasks");
    renderTasks();
  }

  function renderTasks() {
    taskList.replaceChildren(...tasks.map(createTaskElement));
    applyFilter();
    totalCount.textContent = String(tasks.length);
    completedCount.textContent = String(tasks.filter((item) => item.status === "completed").length);
  }

  function createTaskElement(item) {
    const article = document.createElement("article");
    article.className = `task-item${item.status === "completed" ? " is-completed" : ""}`;
    article.dataset.taskId = String(item.id);
    article.dataset.status = item.status;

    const toggle = document.createElement("button");
    toggle.className = "status-control";
    toggle.type = "button";
    toggle.dataset.action = "toggle";
    toggle.setAttribute("aria-label", `${item.status === "completed" ? "Reopen" : "Complete"} task: ${item.title}`);
    const check = document.createElement("span");
    check.setAttribute("aria-hidden", "true");
    check.textContent = item.status === "completed" ? "✓" : "";
    toggle.append(check);

    const copy = document.createElement("div");
    copy.className = "task-copy";
    const heading = document.createElement("div");
    heading.className = "task-heading";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const badge = document.createElement("span");
    badge.className = "status-badge";
    badge.textContent = item.status;
    heading.append(title, badge);
    copy.append(heading);

    if (item.description) {
      const description = document.createElement("p");
      description.textContent = item.description;
      copy.append(description);
    }

    const meta = document.createElement("small");
    const time = document.createElement("time");
    time.dateTime = item.updatedAt;
    time.textContent = formatTime(item.updatedAt);
    meta.append("Updated ", time);
    copy.append(meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(
      actionButton("edit", "Edit", `Edit task: ${item.title}`),
      actionButton("delete", "Delete", `Delete task: ${item.title}`, true),
    );

    article.append(toggle, copy, actions);
    return article;
  }

  function actionButton(action, label, accessibleLabel, danger = false) {
    const button = document.createElement("button");
    button.className = `icon-button${danger ? " icon-button-danger" : ""}`;
    button.type = "button";
    button.dataset.action = action;
    button.title = `${label} task`;
    button.setAttribute("aria-label", accessibleLabel);
    button.textContent = label;
    return button;
  }

  function formatTime(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function applyFilter() {
    let visible = 0;
    for (const item of taskList.querySelectorAll("[data-task-id]")) {
      const show = !activeFilter || item.dataset.status === activeFilter;
      item.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    }
    visibleCount.textContent = `${visible} ${visible === 1 ? "task" : "tasks"}`;
    emptyState.classList.toggle("is-hidden", visible > 0);
  }

  function setBusy(form, busy) {
    for (const control of form.elements) {
      control.disabled = busy;
    }
    form.setAttribute("aria-busy", String(busy));
  }

  function toast(message, error = false) {
    const element = document.createElement("div");
    element.className = `toast${error ? " is-error" : ""}`;
    element.setAttribute("role", error ? "alert" : "status");
    element.textContent = message;
    toastRegion.append(element);
    window.setTimeout(() => element.remove(), 3600);
  }

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(createForm);
    setBusy(createForm, true);

    try {
      await api("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: data.get("title"),
          description: data.get("description"),
        }),
      });
      createForm.reset();
      await refreshTasks();
      setBusy(createForm, false);
      createForm.elements.title.focus();
      toast("Task added to the queue.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      setBusy(createForm, false);
    }
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      applyFilter();
    });
  });

  taskList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    const itemElement = button?.closest("[data-task-id]");
    if (!button || !itemElement) return;

    const item = tasks.find((candidate) => candidate.id === Number(itemElement.dataset.taskId));
    if (!item) return;

    if (button.dataset.action === "edit") {
      editForm.elements.id.value = String(item.id);
      editForm.elements.title.value = item.title;
      editForm.elements.description.value = item.description;
      editDialog.showModal();
      editForm.elements.title.focus();
      return;
    }

    if (button.dataset.action === "delete") {
      deleteForm.elements.id.value = String(item.id);
      deleteTitle.textContent = item.title;
      deleteDialog.showModal();
      return;
    }

    if (button.dataset.action === "toggle") {
      button.disabled = true;
      try {
        await api(`/api/v1/tasks/${item.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            status: item.status === "completed" ? "pending" : "completed",
          }),
        });
        await refreshTasks();
        toast(item.status === "completed" ? "Task reopened." : "Task completed.");
      } catch (error) {
        toast(error.message, true);
      } finally {
        button.disabled = false;
      }
    }
  });

  editForm.addEventListener("submit", async (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const data = new FormData(editForm);
    setBusy(editForm, true);

    try {
      await api(`/api/v1/tasks/${data.get("id")}`, {
        method: "PUT",
        body: JSON.stringify({
          title: data.get("title"),
          description: data.get("description"),
        }),
      });
      editDialog.close();
      await refreshTasks();
      toast("Task updated.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      setBusy(editForm, false);
    }
  });

  deleteForm.addEventListener("submit", async (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const data = new FormData(deleteForm);
    setBusy(deleteForm, true);

    try {
      await api(`/api/v1/tasks/${data.get("id")}`, { method: "DELETE" });
      deleteDialog.close();
      await refreshTasks();
      toast("Task deleted.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      setBusy(deleteForm, false);
    }
  });

  applyFilter();
})();
