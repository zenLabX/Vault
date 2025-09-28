
在 C# 中，`class` (類別) 和 `struct` (結構) 都是用於定義自訂型別的關鍵字，但它們在記憶體管理、行為和用途上存在著本質的區別。理解這些差異對於編寫高效且正確的 C# 程式碼至關重要。

## 核心差異總覽

| 特性        | `class` (參考型別)           | `struct` (值型別)                            |
| :-------- | :----------------------- | :---------------------------------------- |
| **型別**    | [[參考型別MOC]] (參考型別)       | [[值型別MOC]] (值型別)                          |
| **記憶體分配** | 堆 (Heap) 上分配，由垃圾回收器管理    | 堆疊 (Stack) 上分配 (通常)，無須垃圾回收                |
| **預設值**   | `null`                   | 所有成員的預設值 (例如 `int` 為 0, `bool` 為 `false`) |
| **繼承**    | 支援繼承，可作為基底類別被繼承，也可繼承其他類別 | 不支援繼承其他類別，但隱式繼承自 `System.ValueType`       |
| **多型**    | 支援                       | 不支援                                       |
| **封裝**    | 常用於複雜物件和行為的封裝            | 常用於輕量級資料結構的封裝                             |
| **賦值行為**  | 複製參考 (指向同一物件)            | 複製值 (建立新副本)                               |

## 詳細比較

### 1. 型別與記憶體

- **`class`**: 參考型別。物件實例儲存在記憶體堆 (Heap) 上，變數儲存的是該物件的記憶體位址。當賦值時，只複製引用，兩個變數會指向同一個物件。由 .NET 的垃圾回收器 (Garbage Collector) 自動管理記憶體釋放。
- **`struct`**: 值型別。實例通常儲存在記憶體堆疊 (Stack) 上 (作為區域變數或方法參數時)，或作為物件的成員時儲存在物件內部。當賦值時，會建立一個完整的資料副本。其生命週期由其作用域決定，不需要垃圾回收器介入。

### 2. 繼承與多型

- **`class`**: 支援單一繼承，可以實現多個介面。這是實現多型 (Polymorphism) 的基礎。例如：`class Dog : Animal, IMovable`。
- **`struct`**: 不支援繼承其他類別，但可以實現介面。所有的 `struct` 都隱式繼承自 `System.ValueType`，而 `System.ValueType` 又繼承自 `System.Object`。這意味著 `struct` 本身無法成為其他 `struct` 或 `class` 的基底型別。

### 3. 預設值與建構函式

- **`class`**: 預設值為 `null`。可以定義無參數建構函式或帶參數建構函式。
- **`struct`**: 不能定義無參數建構函式 (C# 10 以前的限制，C# 10 後可以)。預設值是其所有成員的預設值 (例如 `int` 為 0，`bool` 為 `false`)。這確保了 `struct` 永遠不會是 `null`。

### 4. 使用時機

- **使用 `class` 的時機**：
    - 需要物件導向的特性，如繼承、多型。
    - 物件較大，頻繁複製會導致效能問題。
    - 需要支援 `null` 值。
    - 處理需要引用語意的複雜行為。
- **使用 `struct` 的時機**：
    - 表示小型、單純的資料結構 (例如點、顏色、坐標)。
    - 不需要物件導向的完整特性，僅需儲存一組相關資料。
    - 值複製語意是期望的行為。
    - 對記憶體分配和效能有較高要求時 (減少堆分配和垃圾回收壓力)。

## 範例

```csharp
using System;

// Class 範例
public class MyClass
{
    public int Value { get; set; }
}

// Struct 範例
public struct MyStruct
{
    public int Value { get; set; }
}

public class Program
{
    public static void Main(string[] args)
    {
        // Class 的賦值行為 (參考複製)
        MyClass obj1 = new MyClass { Value = 10 };
        MyClass obj2 = obj1; // obj2 引用 obj1 所指向的同一個物件
        obj2.Value = 20;
        Console.WriteLine($"Class - obj1.Value: {obj1.Value}, obj2.Value: {obj2.Value}"); // 輸出 20, 20

        // Struct 的賦值行為 (值複製)
        MyStruct s1 = new MyStruct { Value = 10 };
        MyStruct s2 = s1; // s2 複製了 s1 的所有資料，成為一個獨立的副本
        s2.Value = 20;
        Console.WriteLine($"Struct - s1.Value: {s1.Value}, s2.Value: {s2.Value}"); // 輸出 10, 20
    }
}
```

## 相關概念

- [[class 與物件操作]]
- [[Struct]]
- [[值型別MOC]]
- [[參考型別MOC]]
- [[物件導向/封裝]]
- [[Inheritance]]
- [[多型]]

#tags: #Comparison #Class #Struct #ValueType #ReferenceType
