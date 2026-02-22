---
project: Auth
deadline: 2026-03-31
domain_tag: auth
tags: [project, auth]
---

# Auth — Dashboard

## 專案目標
- 3月底完成 DataAdmin 權限管理模組

## Milestone
- [ ] Phase 1：領域知識與架構研究完成 #auth
	status:: backlog
	priority:: medium
	due:: 2026-02-28
- [ ] Phase 2：Schema Study 完成 #auth
	status:: backlog
	priority:: medium
	due:: 2026-02-28
- [ ] Phase 3：Prototype 產出完成 #auth
  status:: backlog
  priority:: medium
  due:: 2026-02-28

## Tasks（#auth）
```dataviewjs
const folder = "Work/Auth";
const tag = "#auth";

const EXCLUDED_FILE_NAME_PARTS = ["Template"]; 
const EXCLUDED_TASK_TEXT_PARTS = ["任務內容"]; 
const MAX_LOOKAHEAD_LINES = 6;

const DateTime = dv.luxon.DateTime;
const fileTextCache = new Map();

async function getFileLines(path) {
  if (!fileTextCache.has(path)) {
    const text = await dv.io.load(path);
    fileTextCache.set(path, text.split(/\r?\n/));
  }
  return fileTextCache.get(path);
}

function isExcludedFileName(fileName) {
  return EXCLUDED_FILE_NAME_PARTS.some(part => (fileName ?? "").includes(part));
}

function isExcludedTaskText(taskText) {
  return EXCLUDED_TASK_TEXT_PARTS.some(part => (taskText ?? "").includes(part));
}

function parseFieldValue(lines, startLineIdx, fieldName) {
  const pattern = new RegExp(`^\\s*${fieldName}::\\s*(.*?)\\s*$`);
  const end = Math.min(lines.length - 1, startLineIdx + MAX_LOOKAHEAD_LINES);
  for (let i = startLineIdx + 1; i <= end; i++) {
    const match = lines[i].match(pattern);
    if (match) return match[1];
  }
  return null;
}

function priorityRank(priority) {
  const p = (priority ?? "").toLowerCase();
  if (p === "high") return 0;
  if (p === "medium") return 1;
  if (p === "low") return 2;
  return 3;
}

const pages = dv.pages(`"${folder}"`);
let tasks = pages.file.tasks
  .where(t => (t.text ?? "").includes(tag))
  .where(t => !isExcludedFileName(t.path.split("/").pop()))
  .where(t => !isExcludedTaskText(t.text));

const enriched = [];
for (const task of tasks) {
  const lines = await getFileLines(task.path);
  const startLineIdx = Math.max(0, (task.line ?? 1) - 1);

  const dueRaw = parseFieldValue(lines, startLineIdx, "due");
  const priorityRaw = parseFieldValue(lines, startLineIdx, "priority");

  const due = dueRaw ? DateTime.fromISO(dueRaw) : null;
  const pr = priorityRank(priorityRaw);
  enriched.push({ task, due, pr, path: task.path, line: task.line ?? 0 });
}

enriched.sort((a, b) => {
  const aHas = !!a.due && a.due.isValid;
  const bHas = !!b.due && b.due.isValid;
  if (aHas && bHas) {
    const diff = a.due.toMillis() - b.due.toMillis();
    if (diff !== 0) return diff;
  } else if (aHas !== bHas) {
    return aHas ? -1 : 1;
  }

  if (a.pr !== b.pr) return a.pr - b.pr;
  if (a.path !== b.path) return a.path.localeCompare(b.path);
  return a.line - b.line;
});

dv.taskList(enriched.map(x => x.task), false);
```

## Blocker
- 

## Risk
- 

## 快速入口
- [[Auth/01-Knowledge/00-Domain-Research]]
- [[Auth/01-Knowledge/01-Schema-Study]]
- [[Auth/02-Architecture/ER-Diagram]]
- [[Auth/03-Implementation/00-Prototype-Plan]]
- [[Auth/04-Meetings/2026-02-23-Work-Output-Alignment]]
- [[Auth/04-Meetings/2026-02-23-Seed-Data-Discussion]]
