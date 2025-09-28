

在 C# 中，`ref` 和 `out` 關鍵字都用於將參數以參考 (reference) 的方式傳遞給方法，這使得方法能夠修改呼叫端傳入的變數。然而，它們在使用方式和要求上存在關鍵差異，理解這些差異對於正確使用它們至關重要。

## 核心差異總覽

| 特性       | `ref` 參數                                   | `out` 參數                                    |
| :--------- | :------------------------------------------- | :-------------------------------------------- |
| **傳遞方向** | 雙向傳遞 (輸入和輸出)                        | 單向輸出 (主要用於方法內部初始化或返回多個值)   |
| **初始化要求** | 呼叫端變數必須在傳遞前初始化                 | 呼叫端變數不需要在傳遞前初始化，方法內部必須在使用前賦值 |
| **關鍵字使用** | 方法宣告和方法呼叫時都必須使用 `ref`         | 方法宣告和方法呼叫時都必須使用 `out`            |
| **主要用途** | 允許方法修改呼叫端現有的變數值                 | 允許方法返回多個值，或在方法內部初始化變數      |

## 詳細比較

### 1. 初始化要求

- **`ref` 參數**：當您使用 `ref` 關鍵字傳遞參數時，呼叫端的變數必須在傳遞給方法之前被初始化。方法可以讀取或修改 `ref` 參數的值。
    ```csharp
    int value = 10; // 必須初始化
    MyRefMethod(ref value);
    ```

- **`out` 參數**：當您使用 `out` 關鍵字傳遞參數時，呼叫端的變數不需要在傳遞給方法之前被初始化。方法內部在使用 `out` 參數之前，必須為它賦值。
    ```csharp
    int result; // 不需要初始化
    MyOutMethod(out result);
    // result 現在肯定被賦值了
    ```

### 2. 傳遞方向與用途

- **`ref` 參數**：用於雙向傳遞資料。方法可以讀取傳入的值，也可以修改它並將修改傳回呼叫端。常用於需要交換兩個變數值 (例如 `Swap` 方法) 或在方法內部修改一個已存在變數的情況。
- **`out` 參數**：主要用於單向輸出資料。它強制方法在返回之前為參數賦值。常用於一個方法需要返回多個值 (例如 `Divide` 方法同時返回商和餘數)，或像 `int.TryParse()` 這樣在方法內部初始化一個值並返回成功與否的布林值。

### 3. 編譯器檢查

- **`ref` 參數**：編譯器會檢查呼叫端是否已初始化 `ref` 參數。
- **`out` 參數**：編譯器會檢查方法內部是否在返回之前為所有 `out` 參數賦值。

## 範例

```csharp
using System;

public class ParameterComparison
{
    // 使用 ref 參數的方法
    public static void AddOneRef(ref int number)
    {
        number = number + 1;
    }

    // 使用 out 參數的方法
    public static void GetValues(out int x, out int y)
    {
        x = 10; // 必須賦值
        y = 20; // 必須賦值
    }

    public static void Main(string[] args)
    {
        // ref 範例
        int initialValue = 5;
        Console.WriteLine($"ref 呼叫前: {initialValue}"); // 輸出: 5
        AddOneRef(ref initialValue);
        Console.WriteLine($"ref 呼叫後: {initialValue}"); // 輸出: 6

        // out 範例 (C# 7.0 之前)
        // int val1, val2;
        // GetValues(out val1, out val2);
        // Console.WriteLine($"out 呼叫後 (舊版): val1={val1}, val2={val2}");

        // out 範例 (C# 7.0 之後的內聯宣告)
        GetValues(out int val3, out int val4);
        Console.WriteLine($"out 呼叫後 (新版): val3={val3}, val4={val4}");
    }
}
```

## 相關概念

- [[ref 參數]]
- [[out 參數]]
- [[參數傳遞]]
- [[方法]]

#tags: #Comparison #Parameter #ref #out #方法
