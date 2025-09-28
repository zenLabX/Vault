#修飾詞（modifiers） 

## 特性修飾詞 (Behavior Modifiers)

| 修飾詞 | 可搭配對象 | 說明 |
| ---------- | ------------------------------ | ----------------------- |
| `abstract` | class, method | 抽象類別/方法，必須被繼承或實作 |
| `sealed` | class | 封閉類別，不能被繼承 |
| `static` | class, field, method, property | 靜態類別或成員，不需實例化 |
| `readonly` | field, struct | 欄位初始化後不可改；struct 可標記不可變 |
| `const` | field | 編譯時常數，初始化後不可改 |
| `virtual` | method, property | 可被 override 的方法或屬性 |
| `override` | method, property | 覆寫 virtual/abstract 成員 |
| `partial` | class, struct | 可拆分多個檔案定義 |
| `extern` | method | 外部方法（通常用於 P/Invoke） |
| `async` | method | 非同步方法 |
| `volatile` | field | 多執行緒存取時不快取值 |
| `unsafe` | class, struct, method, field | 使用指標或不安全程式碼 |