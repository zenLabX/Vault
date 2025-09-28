

在 C# 屬性中，`set` 存取器 (accessor) 負責定義屬性值的寫入邏輯。

## 語法

`set` 存取器由 `set` 關鍵字和大括號 `{}` 包裹的程式碼區塊組成。當外部程式碼嘗試設定屬性值時，`set` 存取器中的程式碼就會被執行。

```csharp
public DataType PropertyName
{
    set
    {
        // 寫入邏輯，通常將傳入的值賦予私有欄位
        _fieldName = value;
    }
}
```

## `value` 關鍵字

在 `set` 存取器中，`value` 是一個隱含的參數，它代表了您賦予屬性的新值。`value` 的型別與屬性本身的型別相同。

## 範例

```csharp
using System;

public class Product
{
    private decimal _price;

    public decimal Price
    {
        get { return _price; } // 這裡只為完整性展示 get 存取器，詳細會在 [[C# get 存取器]] 中說明
        set
        {
            // 可以在設定前執行一些邏輯，例如資料驗證
            if (value < 0)
            {
                throw new ArgumentException("價格不能為負數。");
            }
            Console.WriteLine($"正在設定價格為: {value}");
            _price = value; // 將傳入的 value 賦予私有欄位 _price
        }
    }

    public static void Main(string[] args)
    {
        Product product = new Product(100m);
        Console.WriteLine($"初始價格: {product.Price}");

        product.Price = 120.50m; // 呼叫 set 存取器
        Console.WriteLine($"新價格: {product.Price}");

        try
        {
            product.Price = -10m; // 觸發驗證邏輯
        }
        catch (ArgumentException ex)
        {
            Console.WriteLine($"錯誤: {ex.Message}");
        }
    }
}
```

## 特性

- **寫入專用邏輯**：`set` 存取器主要用於提供屬性的寫入行為。
- **資料驗證**：它是一個理想的地方來實作資料驗證邏輯，確保賦予屬性的值是有效的。
- **可見性**：`set` 存取器可以有不同的存取修飾詞，獨立於 `get` 存取器和屬性本身。例如，您可以有一個 `public` 屬性，但其 `set` 存取器是 `private`，而 `get` 存取器是 `public`。

## 相關概念

- [[屬性概念]]
- [[get 存取器]]
- [[存取修飾詞]]

#tags: #OOP #Property #Accessor #set
