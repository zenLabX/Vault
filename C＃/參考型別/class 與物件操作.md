

這份筆記將深入探討 C# 中的參考型別，特別是 Class (類別) 與 Object (物件) 的概念、建立與操作。理解這些基礎對於後續學習 ASP.NET Core MVC 至關重要。


## Class 宣告範例

以下是 `Program.cs` 中定義的 `Person` 類別範例，它展示了一個簡單的類別結構，包含欄位與方法。

- Field（欄位，存放資料）
- [[屬性MOC]]（屬性，存取欄位的語法糖）
- Method（方法，操作或運算）
- Constructor（建構子，初始化物件）
- Destructor（解構子，釋放資源，少用）


```csharp

public class Person

{

	// Field（欄位）：儲存物件的資料
	public string MyName;

  
	// Method（方法）：定義物件的行為
	public void Introduce(string to)
	{
	
		Console.WriteLine("Hello {0}, I'm {1}.", to, MyName);
	
	}

	// Static Method（靜態方法）：屬於類別本身，不屬於任何物件實例
	// 可以直接透過類別名稱呼叫，不需要先建立物件
	public static Person ParseMyName(string str)
	{
		var person = new Person();
		person.MyName = str;
		return person;
	}

}

```

  

## 物件建立與實例操作

  
在 C# 中，我們使用 `new` 關鍵字來建立類別的實例，即物件。一旦物件被建立，我們就可以透過物件變數來存取其欄位和方法。


參考 `Program.cs` 中的 `Example1_InstanceAndProperties()` 範例：

```csharp

// Program.cs 中的 Example1_InstanceAndProperties() 範例
// 範例 1: 建立 instance 操作裡面的屬性
public static void Example1_InstanceAndProperties()
{
	
	var person = new Person(); // 建立一個 Person 類別的物件實例
	
	person.MyName = "Yvonne"; // 設定 Person 物件的 MyName 欄位
	
	person.Introduce("Joyce"); // 呼叫 Person 物件的 Introduce 方法

}

```

**說明：**

- `var person = new Person();`：這行程式碼在記憶體的堆積 (Heap) 區中建立了一個 `Person` 類別的新物件，並將該物件的記憶體位址 (參考) 賦值給 `person` 變數。

- `person.MyName = "Yvonne";`：透過 `person` 變數存取物件的 `MyName` 欄位並賦予值。

- `person.Introduce("Joyce");`：透過 `person` 變數呼叫物件的 `Introduce` 方法，執行物件定義的行為。

  

### 多個變數指向同一個物件

  

參考以下範例，了解當多個變數指向同一個物件時，對其中一個變數的修改會如何影響其他變數：
  

```csharp

Person p1 = new Person(); // 建立第一個 Person 物件

p1.MyName = "Alice";

  

Person p2 = p1; // p2 指向與 p1 相同的物件

p2.MyName = "Bob"; // 透過 p2 修改物件的 MyName

  

Console.WriteLine(p1.MyName); // 輸出 "Bob"，因為 p1 與 p2 指向同一個物件

```

  

**小提醒：**

- `new` 關鍵字：會在記憶體的堆積 (Heap) 中建立新的物件。

- 多個變數指向同一物件：當多個參考型別變數被賦予同一個物件的參考時，它們都指向記憶體中的同一個物件。修改其中一個變數的內容會影響所有指向該物件的其他變數。
  

## 靜態成員與方法

靜態成員 (static members) 屬於類別本身，而不是類別的任何特定實例 (物件)。這表示您不需要建立物件就可以直接透過類別名稱來存取靜態成員。


參考 `Program.cs` 中的 `Example2_StaticMembers()` 範例：

```csharp

// Program.cs 中的 Example2_StaticMembers() 範例

// 範例 2: static 屬於 class，不屬於 instance (物件)

public static void Example2_StaticMembers()

{

// 靜態方法 ParseMyName 直接透過類別 Person 呼叫

var person = Person.ParseMyName("Joyce");

person.Introduce("Furry");

// 注意: 不能透過 instance 物件 (person) 去存取 class 層級的靜態成員。

// 例如，如果 Person 類別有一個靜態欄位 CompanyName，您應該使用 Person.CompanyName 而不是 person.CompanyName。

}

```

**說明：**

- `Person.ParseMyName("Joyce");`：這行程式碼直接透過類別名稱 `Person` 呼叫了靜態方法 `ParseMyName`。這個方法內部創建了一個新的 `Person` 物件並設定其 `MyName`。

- 靜態方法常用於工具方法、工廠方法或管理類別級別的資料。

- 與實例方法 (如 `Introduce()`) 不同，靜態方法不需要先建立 `Person` 物件才能呼叫。

  

## null 與物件釋放

- 參考型別變數可以為 `null`，表示該變數目前沒有指向任何物件。

- 當物件在記憶體中沒有任何參考變數指向它時，C# 的垃圾回收器 (Garbage Collector, GC) 會自動回收該物件所佔用的記憶體空間。

```csharp

Person p3 = null; // p3 變數沒有指向任何物件

```

  

## 方法中傳遞 Reference Type


在 C# 中，當參考型別作為方法的參數傳遞時，預設是「傳值呼叫 (Pass by Value)」，但傳遞的是「參考的複本」。這意味著：

- **方法內部對物件內容的修改，會影響到原物件**，因為參考的複本仍然指向同一個物件。

- **方法內部不能更換變數指向的物件**，因為您只是在操作參考的複本。

```csharp

void UpdatePersonAge(Person p) // p 是傳入物件參考的複本

{

p.MyName = "Charlie"; // 修改原物件的 MyName 欄位

// p = new Person(); // 這行程式碼會使方法內的 p 指向新物件，但不會影響原始傳入的物件變數

}

  

Person p4 = new Person();

p4.MyName = "Eve";

UpdatePersonAge(p4);

Console.WriteLine(p4.MyName); // 輸出 "Charlie"，原物件的內容被修改了

```

  

### Pass by Reference (ref / out)

如果您需要在方法內部更換變數指向的物件，可以使用 `ref` 或 `out` 關鍵字實現「傳參考呼叫 (Pass by Reference)」。

```csharp

void ReplacePersonObject(ref Person p)

{

p = new Person(); // 將 p 指向一個全新的 Person 物件

p.MyName = "Dave";

}

  

Person p5 = new Person();

p5.MyName = "Original Eve";

ReplacePersonObject(ref p5);

Console.WriteLine(p5.MyName); // 輸出 "Dave"，因為 p5 現在指向了一個全新的物件

```

  

## 開發快速查詢重點

- Reference Type = 堆積區 (Heap) 物件 + 指向它的參考變數。

- `==` 比較的是「兩個參考變數是否指向同一個物件」 (預設行為，可重載)。

- 變數賦值 `=`：複製的是「參考」，而不是物件本身。

- 可為 `null`，需注意 `NullReferenceException` (空參考例外)。

- 方法參數預設 Pass by Value (複製參考)，可用 `ref` / `out` 改變變數指向的物件。