- Delegate（委派） 是 Reference Type。

- 可以指向方法，賦值給另一個變數會複製參考。

- 修改 delegate 內容會影響所有持有該 reference 的變數。

  

```csharp

  

public delegate void Notify(string message);

  

void SendMessage(string msg)

{

Console.WriteLine(msg);

}

  

Notify notifier = SendMessage;

notifier("Hello"); // Hello

  
  

```