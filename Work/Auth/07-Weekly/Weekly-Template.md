---
project: Auth
tags: [weekly, auth]
---

# Weekly — <YYYY-[W]WW>

## 本週完成（#auth）
```dataviewjs
const folder = "Work/Auth";
const tag = "#auth";

const start = dv.luxon.DateTime.local().startOf("week");
const end = dv.luxon.DateTime.local().endOf("week");

const pages = dv.pages(`"${folder}"`);
const tasks = pages.file.tasks
  .where(t => t.completed)
  .where(t => (t.text ?? "").includes(tag))
  .where(t => t.completion && t.completion >= start && t.completion <= end);

dv.taskList(tasks, false);
```

## 本週摘要
- 

## 下週目標
- 

## Blocker
- 

## Risk
- 
