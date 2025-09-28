#修飾詞（modifiers） 

## 存取修飾詞 (Access Modifiers)


存取修飾詞 (Access Modifiers) 用來指定類別、成員 (欄位、屬性、方法等) 的可存取性。它們控制了程式碼的其他部分 (甚至其他組件) 是否可以看見或使用這些元素。理解存取修飾詞對於建立良好的封裝 (Encapsulation) 和模組化設計至關重要。


### 總覽表格


| 修飾詞                  | 可搭配對象                                                   | 說明                                                  |
| -------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| `public`             | class, struct, enum, interface, field, property, method | 對外完全公開，任何程式碼都可以存取。                                  |
| `internal`           | class, struct, enum, interface, field, property, method | 只能在定義它的 **同一組件 (Assembly)** 內部存取。                   |
| `protected`          | class, field, property, method                          | 只能在定義它的 **類別內部** 或其 **衍生類別 (Derived Class) 內部** 存取。 |
| `private`            | class, struct, field, property, method                  | 只能在定義它的 **類別內部** 存取。                                |
| `protected internal` | class, field, property, method                          | 在 **同一組件內** 的任何程式碼，或者 **衍生類別內部** 都可以存取。             |
| `private protected`  | class, field, property, method                          | 只能在定義它的 **同一組件內** 且在 **衍生類別內部** 存取。                 |

  

### 程式碼範例與詳細說明

為了更好地理解各種存取修飾詞，我們將透過一個 `ExampleClass` 來演示它們的行為。


```csharp

using System;

  

namespace AccessModifiersDemo

{

// 公共類別，可以在任何地方存取

public class ExampleClass

{

public string publicField = "我是公共欄位";

internal string internalField = "我是內部欄位";

protected string protectedField = "我是保護欄位";

private string privateField = "我是私有欄位";

  

public string PublicProperty { get; set; } = "我是公共屬性";

internal string InternalProperty { get; set; } = "我是內部屬性";

protected string ProtectedProperty { get; set; } = "我是保護屬性";

private string PrivateProperty { get; set; } = "我是私有屬性";

  

public void PublicMethod() { Console.WriteLine("我是公共方法"); }

internal void InternalMethod() { Console.WriteLine("我是內部方法"); }

protected void ProtectedMethod() { Console.WriteLine("我是保護方法"); }

private void PrivateMethod() { Console.WriteLine("我是私有方法"); }

  

public ExampleClass()

{

// 在同一個類別內部，所有成員都可以存取

Console.WriteLine("--- ExampleClass 內部存取 ---");

Console.WriteLine(publicField);

Console.WriteLine(internalField);

Console.WriteLine(protectedField);

Console.WriteLine(privateField);

PublicMethod();

InternalMethod();

ProtectedMethod();

PrivateMethod();

Console.WriteLine("--------------------------\n");

}

}

  

// 衍生類別，繼承自 ExampleClass

public class DerivedClass : ExampleClass

{

public DerivedClass()

{

// 在衍生類別內部，可以存取 public 和 protected 成員

Console.WriteLine("--- DerivedClass 內部存取 ---");

Console.WriteLine(publicField); // OK

Console.WriteLine(protectedField); // OK

// Console.WriteLine(internalField); // 如果 DerivedClass 在不同組件，則錯誤

// Console.WriteLine(privateField); // 錯誤：無法存取私有成員

PublicMethod(); // OK

ProtectedMethod(); // OK

// InternalMethod(); // 如果 DerivedClass 在不同組件，則錯誤

// PrivateMethod(); // 錯誤：無法存取私有方法

Console.WriteLine("--------------------------\n");

  

// 示範 protected internal

protectedInternalField = "Protected Internal Changed";

Console.WriteLine($"Protected Internal Field in Derived: {protectedInternalField}");

  

// 示範 private protected

// privateProtectedField = "Private Protected Changed"; // 錯誤：只能在同組件內存取

}

  

protected internal string protectedInternalField = "我是 protected internal 欄位";

private protected string privateProtectedField = "我是 private protected 欄位";

  

public void TestPrivateProtected()

{

// private protected 只能在同組件且衍生類別內部存取

Console.WriteLine($"Private Protected Field: {privateProtectedField}");

}

}

  

// 外部類別，位於同一個組件但不是衍生類別

public class ExternalClassInSameAssembly

{

public void TestAccess()

{

ExampleClass obj = new ExampleClass();

Console.WriteLine("--- ExternalClassInSameAssembly 存取 ---");

Console.WriteLine(obj.publicField); // OK

Console.WriteLine(obj.internalField); // OK (同組件)

// Console.WriteLine(obj.protectedField); // 錯誤：protected 只能在類別內部或衍生類別內部存取

// Console.WriteLine(obj.privateField); // 錯誤：private 只能在類別內部存取

  

obj.PublicMethod(); // OK

obj.InternalMethod(); // OK (同組件)

// obj.ProtectedMethod(); // 錯誤

// obj.PrivateMethod(); // 錯誤

  

// 存取 DerivedClass 的 protected internal 成員

DerivedClass derivedObj = new DerivedClass();

Console.WriteLine($"Derived protected internal Field: {derivedObj.protectedInternalField}"); // OK (同組件)

// Console.WriteLine(derivedObj.privateProtectedField); // 錯誤

Console.WriteLine("--------------------------\n");

}

}

  

// 假設有一個在不同組件 (Assembly) 的類別

// public class ExternalClassInDifferentAssembly : ExampleClass

// {

// public ExternalClassInDifferentAssembly()

// {

// // 只能存取 public 和 protected 成員

// Console.WriteLine(publicField); // OK

// Console.WriteLine(protectedField); // OK

// // Console.WriteLine(internalField); // 錯誤：internal 只能在同組件內存取

// // Console.WriteLine(privateField); // 錯誤

// // Console.WriteLine(protectedInternalField); // 錯誤：protected internal 在不同組件不能直接存取

// }

// }

  

public class Program

{

public static void Main(string[] args)

{

ExampleClass example = new ExampleClass();

DerivedClass derived = new DerivedClass();

ExternalClassInSameAssembly external = new ExternalClassInSameAssembly();

external.TestAccess();

derived.TestPrivateProtected();

  

// 如果需要測試不同組件的行為，您需要建立一個新的專案作為不同的組件。

// 但基本的概念是 internal 的成員將不可見。

}

}

}

```

---

### `public` (公共的)

- 任何地方都可以存取。它是最寬鬆的存取層級，適用於希望完全公開的類別成員。

- 範例中，`ExampleClass` 的 `publicField`、`PublicProperty` 和 `PublicMethod()` 都可以被 `ExampleClass` 自身、`DerivedClass` 和 `ExternalClassInSameAssembly` 存取。

  
### `internal` (內部的)

- 只能在定義它的 **同一組件 (Assembly)** 內部存取。

- 不同的組件 (例如不同的專案編譯出的 DLL) 無法存取 `internal` 成員。

- 範例中，`internalField` 和 `InternalMethod()` 在 `ExampleClass`、`DerivedClass` (因為在同組件) 和 `ExternalClassInSameAssembly` 中都可以存取。如果 `DerivedClass` 或 `ExternalClass` 在不同的組件中，就無法存取。


### `protected` (受保護的)

- 只能在定義它的 **類別內部** 或其 **衍生類別 (Derived Class) 內部** 存取。

- 外部類別 (即使在同一組件內) 無法直接存取 `protected` 成員。

- 範例中，`protectedField` 和 `ProtectedMethod()` 可以在 `ExampleClass` 內部和 `DerivedClass` 內部存取，但在 `ExternalClassInSameAssembly` 中無法直接存取 `obj.protectedField`。


### `private` (私有的)

- 只能在定義它的 **類別內部** 存取。這是最嚴格的存取層級，用於完全封裝類別的內部實現細節。

- 範例中，`privateField` 和 `PrivateMethod()` 只能在 `ExampleClass` 內部存取。即使是 `DerivedClass` 也無法存取它們。


### `protected internal` (受保護內部)

- `protected` 和 `internal` 的組合。它可以在 **同一組件內** 的任何地方存取，或者在 **定義它的類別的衍生類別內部** 存取 (即使衍生類別在不同的組件)。

- 範例中，`DerivedClass` 中的 `protectedInternalField` 可以在 `DerivedClass` 內部存取，也可以在 `ExternalClassInSameAssembly` 中透過 `derivedObj.protectedInternalField` 存取。

  

### `private protected` (私有受保護)

- `private` 和 `protected` 的組合。它只能在定義它的 **同一組件內** 且在 **衍生類別內部** 存取。

- 這個修飾詞比 `protected` 更嚴格，因為它限制了跨組件的衍生類別存取。

- 範例中，`DerivedClass` 中的 `privateProtectedField` 可以在 `DerivedClass` 內部存取 (`TestPrivateProtected` 方法)，但在 `ExternalClassInSameAssembly` 中無法存取。