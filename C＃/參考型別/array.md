

```csharp

int[] numbers = { 1, 2, 3 };

int[] copy = numbers; // 指向同一個陣列

copy[0] = 99;

  

Console.WriteLine(numbers[0]); // 99

```

  

### 重點  

- 陣列是 Reference Type。

- 賦值只是複製參考，不會複製陣列本身。

- 修改陣列內容會影響所有指向它的變數。

  

### 建立新陣列（複製資料）
  
```csharp

int[] clone = (int[])numbers.Clone();

clone[0] = 100;

  

Console.WriteLine(numbers[0]); // 99

Console.WriteLine(clone[0]); // 100

```