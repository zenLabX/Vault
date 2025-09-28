

在 C# 中，`ref` 關鍵字用於將參數以「參考」的方式傳遞給方法。這意味著方法內部對參數所做的任何修改，都將反映到呼叫端原始變數上。

## 特性

- **雙向傳遞**：`ref` 參數是雙向的，即呼叫端變數的值會傳遞給方法，方法對參數的修改也會傳回呼叫端。
- **初始化要求**：在傳遞 `ref` 參數之前，呼叫端的變數必須先被初始化。
- **明確的 `ref` 關鍵字**：在方法宣告和方法呼叫時，都必須使用 `ref` 關鍵字，以明確表示該參數是以參考方式傳遞。

## 語法

```csharp
public void MyMethod(ref int myParameter)
{
    // ...
}

// 呼叫方式
int myVariable = 10;
MyMethod(ref myVariable);
```

## 範例

```csharp
using System;

public class Example
{
    public static void Swap(ref int a, ref int b)
    {
        int temp = a;
        a = b;
        b = temp;
        Console.WriteLine($"在 Swap 內部: a = {a}, b = {b}");
    }

    public static void Main(string[] args)
    {
        int x = 5;
        int y = 10;
        Console.WriteLine($"呼叫 Swap 前: x = {x}, y = {y}"); // 輸出: 5, 10

        Swap(ref x, ref y);

        Console.WriteLine($"呼叫 Swap 後: x = {x}, y = {y}"); // 輸出: 10, 5
    }
}
```

## 使用時機

- 當您需要方法能夠修改多個值，並將這些修改傳回呼叫端時。
- 當您需要傳遞大型的結構 (struct) 以避免不必要的複製，從而提升效能時 (雖然 C# 7.2 後的 `in` 參數在某些情況下可能更適合)。

## 相關概念

- [[out 參數]]
- [[參數傳遞]]

#tags: #Parameter #ref #方法
