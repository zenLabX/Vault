

在 C# 中，`out` 關鍵字用於將參數以「輸出」的方式傳遞給方法。這意味著方法必須在返回之前為 `out` 參數賦值，而呼叫端不需要在傳遞 `out` 參數之前對其進行初始化。

## 特性

- **單向輸出**：`out` 參數主要用於方法返回多個值，或在方法內部初始化一個變數。
- **初始化要求**：在方法內部，`out` 參數在使用前必須被賦值。呼叫端的變數在傳遞給 `out` 參數時不需要初始化。
- **明確的 `out` 關鍵字**：在方法宣告和方法呼叫時，都必須使用 `out` 關鍵字。

## 語法

```csharp
public void MyMethod(out int result)
{
    // ...
}

// 呼叫方式 (C# 7.0 以前)
int myResult;
MyMethod(out myResult);

// 呼叫方式 (C# 7.0 之後，可以內聯宣告)
MyMethod(out int myResult);
```

## 範例

```csharp
using System;

public class Example
{
    public static void Divide(int a, int b, out int quotient, out int remainder)
    {
        if (b == 0)
        {
            throw new ArgumentException("除數不能為零。");
        }
        quotient = a / b;     // 方法內部必須為 out 參數賦值
        remainder = a % b;
    }

    public static void Main(string[] args)
    {
        int num1 = 10;
        int num2 = 3;

        Divide(num1, num2, out int q, out int r); // C# 7.0 內聯宣告

        Console.WriteLine($"{num1} 除以 {num2} 的商是 {q}，餘數是 {r}");

        // 舊版 C# 寫法
        // int q2, r2;
        // Divide(num1, num2, out q2, out r2);
    }
}
```

## 使用時機

- 當您需要一個方法返回多個值時 (例如除法運算同時返回商和餘數)。
- 當您需要一個方法初始化一個變數，而該變數在呼叫前可能沒有被初始化時 (例如 `TryParse` 方法)。

## 相關概念

- [[ref 參數]]
- [[參數傳遞]]

#tags: #Parameter #out #方法
