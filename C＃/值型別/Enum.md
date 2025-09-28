#### Enum 是值型別 (value type)

每個成員預設值從 0 開始，依序累加

```csharp

public enum Days

{
	Monday, // 0
	Tuesday, // 1
	Wednesday // 2
}

```

---

  

可以手動指定數值：

```csharp

public enum Days

{
	Monday = 1,
	Tuesday = 2,
	Wednesday = 5
}

  

```

  

---

## Enum 速查表


| 特性            | 說明                                                  |
| ------------- | --------------------------------------------------- |
| 值型別           | Enum 是 Value Type，本質是整數型別 (預設 int)                  |
| 可指定底層型別       | 預設 `int`，可用 byte, short, long 等                     |
| 方便使用具名常數      | 讀程式碼比直接寫數字清楚                                        |
| 可用於旗標 (Flags) | 可以用位元運算組合多個值                                        |
| 不能繼承          | 不能從 enum 繼承其他 enum 或 class                          |
| 可轉換           | 可用 `(int)` 或 `Enum.Parse` / `Enum.TryParse` 互換數值與名稱 |

---

## 開發提醒

enum 適合用途：
- 狀態值 (Status)
- 選項列表 (Option List)
- 位元旗標 (Flags)

  

注意：
- Enum 是值型別 → 傳遞會複製值
- 避免使用過大或頻繁改變的 enum
- 使用 ==Flags== 時底層值建議 2 的次方，以方便位元運算