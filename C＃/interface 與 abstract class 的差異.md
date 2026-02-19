

在 C# 中，`interface` (介面) 和 `abstract class` (抽象類別) 都用於定義契約 (contracts) 和提供抽象性，但它們在使用方式、繼承關係和設計目的上存在顯著差異。理解這些差異對於選擇適合的抽象機制至關重要。

## 核心差異總覽

| 特性           | `interface` (介面)                          | `abstract class` (抽象類別)                     |
| :------------- | :------------------------------------------ | :---------------------------------------------- |
| **型別**         | 參考型別                                    | 參考型別                                        |
| **實例化**       | 不能直接實例化                              | 不能直接實例化                                  |
| **成員**         | 只能包含抽象成員 (C# 8.0 後可有預設實作)
通常只宣告方法、屬性、事件、索引器，不包含欄位和建構函式。 | 可以包含抽象成員和具體成員 (方法、欄位、屬性、建構函式) |
| **多重繼承**     | 一個類別可以實作多個介面                     | 一個類別只能繼承一個抽象類別 (單一繼承)         |
| **繼承層次**     | 無關聯的類別可以實作同一介面                 | 通常用於定義一組相關類別的共同基底               |
| **存取修飾詞**   | 介面成員預設為 `public`，不能有明確的存取修飾詞 | 抽象類別成員可以有各種存取修飾詞 (public, private, protected 等) |
| **設計目的**     | 規範行為，實現多型，定義能力                 | 提供通用基底實作，強制子類別實作特定行為        |

## 詳細比較

### 1. 成員的實作

- **`interface`**: 在 C# 8.0 之前，介面只能宣告成員，不能包含實作。所有成員都是隱式抽象和 `public` 的。從 C# 8.0 開始，介面可以包含預設實作的方法和靜態成員，但仍不能包含欄位。
- **`abstract class`**: 可以包含抽象成員 (沒有實作的方法、屬性等) 和具體成員 (有完整實作的方法、欄位、屬性、建構函式等)。這允許抽象類別提供部分實現，並將某些方法的實作留給子類別。

### 2. 多重繼承

- **`interface`**: C# 不支援類別的多重繼承，但一個類別可以實作多個介面。這使得一個類別可以具備多種「能力」或「行為契約」。
- **`abstract class`**: 一個類別只能繼承一個抽象類別。這是 C# 單一繼承的限制。

### 3. 設計目的

- **`interface`**: 主要用於定義一套行為規範 (contract) 或能力，讓實現它的類別必須提供這些行為。它強調「可以做什麼」。介面非常適合用於設計外掛架構、策略模式或解耦應用程式組件。
- **`abstract class`**: 主要用於在相關類別之間共享程式碼和結構，提供一個共同的基底實作，並強制子類別實作某些特定的抽象行為。它強調「是什麼」(is-a 關係)。

## 範例

```csharp
using System;

// 介面範例
public interface ILogger
{
    void LogMessage(string message);
}

// 抽象類別範例
public abstract class Animal
{
    public string Name { get; set; }
    public abstract void MakeSound(); // 抽象方法

    public void Eat()
    {
        Console.WriteLine("動物正在吃東西。");
    }
}

public class ConsoleLogger : ILogger
{
    public void LogMessage(string message)
    {
        Console.WriteLine($"Log: {message}");
    }
}

public class Dog : Animal, ILogger // 繼承抽象類別並實作介面
{
    public override void MakeSound()
    {
        Console.WriteLine("汪！汪！");
    }

    public void LogMessage(string message)
    {
        Console.WriteLine($"Dog Log: {message}");
    }
}

public class Program
{
    public static void Main(string[] args)
    {
        // ILogger logger = new ILogger(); // 錯誤：不能實例化介面
        ILogger consoleLogger = new ConsoleLogger();
        consoleLogger.LogMessage("Hello from logger!");

        // Animal animal = new Animal(); // 錯誤：不能實例化抽象類別
        Dog dog = new Dog { Name = "Buddy" };
        dog.MakeSound();
        dog.Eat();
        dog.LogMessage("Buddy is happy.");
    }
}
```

## 相關概念

- [[interface]]
- [[抽象類別]]
- [[Inheritance]]
- [[多型]]
- [[物件導向/封裝]]

#tags: #Comparison #Interface #AbstractClass #OOP #型別
