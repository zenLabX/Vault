
- object 是所有型別的基底 Reference Type。

- 可存放任何 Reference Type。

- 需要轉型 (cast) 才能操作原本的屬性或方法。

  
```csharp

  

object obj1 = new Person("Alice", 25);

object obj2 = obj1;

  

((Person)obj2).Name = "Bob";

Console.WriteLine(((Person)obj1).Name); // Bob

  

```
