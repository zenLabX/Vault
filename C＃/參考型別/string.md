  
```csharp

string s1 = "hello";

string s2 = s1;

s2 = "world";

Console.WriteLine(s1); // "hello"

```

  

### 重點

- 字串是 Reference Type，但不可變（immutable）。

- 修改字串會建立新物件，而不是改原本物件。

- 指向字串的變數可以被重新指向其他字串。

  

### 與方法搭配

```csharp

//陣列

void ChangeArray(int[] arr)

{

arr[0] = 123;

}

  

int[] myArr = { 1, 2, 3 };

ChangeArray(myArr);

Console.WriteLine(myArr[0]); // 123

  

//字串

void ChangeString(string str)

{

str = "changed";

}

  

string myStr = "original";

ChangeString(myStr);

Console.WriteLine(myStr); // "original"

  

```