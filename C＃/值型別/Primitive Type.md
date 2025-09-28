#### 原始型別 / 內建型別


以下表中代表各個型別的類型，可以儲存的數值類型，內建最基本的型別（值型別）。

| C# 型別     | .NET 對應          | 大小/精度                   | 範例值          | 何時用               |
| --------- | ---------------- | ----------------------- | ------------ | ----------------- |
| `int`     | `System.Int32`   | 32-bit 整數               | 0, 123, -99  | 日常整數計算最常用         |
| `long`    | `System.Int64`   | 64-bit 整數               | 1234567890   | 大整數或資料庫對應 bigint  |
| `short`   | `System.Int16`   | 16-bit 整數               | 1000         | 記憶體敏感或小範圍數字       |
| `byte`    | `System.Byte`    | 8-bit 整數 (0\~255)       | 255          | 位元運算、檔案讀寫         |
| `bool`    | `System.Boolean` | 1-bit（實際上 CLR 是 1 byte） | true / false | 判斷、開關             |
| `char`    | `System.Char`    | 16-bit Unicode          | 'A', '你'     | 單一字元              |
| `string`  | `System.String`  | N/A                     | "Hello"      | 文字處理、輸入輸出         |
| `float`   | `System.Single`  | 32-bit 浮點               | 3.14f        | 科學計算或輕量小數         |
| `double`  | `System.Double`  | 64-bit 浮點               | 3.1415926    | 一般小數計算            |
| `decimal` | `System.Decimal` | 128-bit 精度高             | 123.45m      | 財務、金錢計算           |
| `object`  | `System.Object`  | 可存任何型別                  | 任何型別         | 泛型容器、反射           |
| `dynamic` | `System.Object`  | 編譯時不檢查                  | 任何型別         | 運行時才決定型別          |
| `var`     | 編譯器推斷            | 依初始值                    | var x = 5;   | 可讀性高，編譯器自動決定型別    |
| `int?`    | Nullable<Int32>  | 可為 null 的 int           | null / 5     | 資料庫欄位、optional 整數 |

---

## 💡 記憶技巧


1. 整數系列：byte < short < int < long → 越往右數值範圍越大

2. 小數系列：float < double < decimal → 精度依次提高

3. 文字：char 單字元，string 多字元

4. 特殊：var/dynamic/object → 彈性型別