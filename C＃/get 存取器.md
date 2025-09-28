

在 C# 屬性中，`get` 存取器 (accessor) 負責定義屬性值的讀取邏輯。

## 語法

`get` 存取器由 `get` 關鍵字和大括號 `{}` 包裹的程式碼區塊組成。當外部程式碼嘗試讀取屬性值時，`get` 存取器中的程式碼就會被執行。

```csharp
public DataType PropertyName
{
    get
    {
        // 讀取邏輯，通常返回私有欄位的值
        return _fieldName;
    }
}
```

## 範例

```csharp
using System;

public class Product
{
    private decimal _price;

    public decimal Price
    {
        get
        {
            // 可以在讀取前執行一些邏輯，例如日誌記錄、資料轉換等
            Console.WriteLine("正在讀取價格...");
            return _price; // 返回私有欄位 _price 的值
        }
        set { _price = value; } // 這裡只為完整性展示 set 存取器，詳細會在 [[C# set 存取器]] 中說明
    }

    public Product(decimal initialPrice)
    {
        _price = initialPrice;
    }

    public static void Main(string[] args)
    {
        Product product = new Product(99.99m);
        decimal currentPrice = product.Price; // 呼叫 get 存取器
        Console.WriteLine($"產品價格: {currentPrice}");
    }
}
```

## 特性

- **讀取專用邏輯**：`get` 存取器主要用於提供屬性的讀取行為。
- **返回值**：它必須返回屬性型別的值。
- **可見性**：`get` 存取器可以有不同的存取修飾詞，獨立於 `set` 存取器和屬性本身。例如，您可以有一個 `public` 屬性，但其 `set` 存取器是 `private`，而 `get` 存取器是 `public`。

## 相關概念

- [[屬性概念]]
- [[set 存取器]]
- [[存取修飾詞]]

#tags: #OOP #Property #Accessor #get
