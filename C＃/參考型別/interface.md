  
- Interface （介面）本身是 Reference Type。

- 變數存放的是物件參考。

- 可以指向任何實作了該 interface 的物件。

  
```csharp

public interface IWorker

{

void Work();

}

  

public class Developer : IWorker

{

public void Work()

{

Console.WriteLine("Coding...");

}

}

  

IWorker worker = new Developer();

worker.Work(); // Coding...

  

```