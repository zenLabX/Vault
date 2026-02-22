---
project: Auth
deadline: 2026-03-31
tags: [implementation, auth]
---

# Implementation — Auth

## 當前重點
- [[Auth/03-Implementation/00-Prototype-Plan]]

## Tasks（#auth）
```dataviewjs
const folder = "Work/Auth";
const tag = "#auth";

const EXCLUDED_FILE_NAME_PARTS = ["Template"];
const EXCLUDED_TASK_TEXT_PARTS = ["任務內容"];

function isExcludedFile(path) {
	const fileName = (path ?? "").split("/").pop() ?? "";
	return EXCLUDED_FILE_NAME_PARTS.some((part) => fileName.includes(part));
}

function isExcludedTaskText(taskText) {
	return EXCLUDED_TASK_TEXT_PARTS.some((part) => (taskText ?? "").includes(part));
}

function isMeaningfulTaskText(taskText) {
	const cleaned = (taskText ?? "").split(tag).join("").trim();
	return cleaned.length > 0;
}

const pages = dv.pages(`"${folder}"`);

let tasks = pages.file.tasks
	.where((task) => !task.completed)
	.where((task) => (task.text ?? "").includes(tag))
	.where((task) => !isExcludedFile(task.path))
	.where((task) => !isExcludedTaskText(task.text))
	.where((task) => isMeaningfulTaskText(task.text))
	.sort((a, b) => (a.due?.ts ?? Number.POSITIVE_INFINITY) - (b.due?.ts ?? Number.POSITIVE_INFINITY));

dv.taskList(tasks, false);
```
