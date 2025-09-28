#### Struct 是值型別 (value type)

- Struct 適合 小型資料，像座標、顏色、數學向量

- 避免長期變動的 struct，因為每次傳值都會複製，效能會下降

- 如果需要繼承或多態，請用 class

- 可以用 readonly struct 或 readonly 成員來做 不可變資料，更安全

---

### 結構說明

可以有欄位 (fields)、屬性 (properties)、方法 (methods)、建構子 (constructor)，但建構子只是 struct 裡面的一個成員，用來初始化欄位而已。

- struct = 一個盒子（型別，存資料）
- 建構子 = 打開盒子前放東西的方式（初始化欄位的方法）
- 方法 = 盒子裡的操作指令

```csharp

// 定義 struct 型別

public struct Point

{

	public int X; // 欄位
	public int Y;
	
	// 這是建構子 (constructor)，用來初始化 Point 的欄位
	public Point(int x, int y)
	{
		X = x;
		Y = y;
	}
	
	// 這是方法 (method)，可以操作 Point 的資料
	public void Print()
	{
		Console.WriteLine($"({X}, {Y})");
	}

}

```

  

## 特性整理

| 特性          | 說明                                              |
| ----------- | ----------------------------------------------- |
| 值型別         | 儲存實際資料在 stack（預設）                               |
| 不支援繼承 class | 不能被繼承，也不能繼承 class                               |
| 可以實作介面      | 可實作 interface                                   |
| 自動生成建構子     | 預設建構子會自動生成，不能自訂無參數建構子（C# 10 可使用 `struct()` 初始化） |
| 小型資料最佳      | 適合存放小型、不可變資料（immutable）                         |
| 預設為 public  | 成員若不加修飾詞，預設 private                             |
