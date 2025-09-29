#低耦合 

  
Composition (組合)，是「某物裡面有另一個物件」，更白話說就是「一個類別擁有另一個類別作為屬性」，跟繼承沒關係。

- ==has-a== →
- Car has a Engine
- Dog has a Tail

---

## 範例一：在 Installer class 中有 Logger 實作

```csharp

public class Installer
{
	private Logger _logger;
	
	public Installer(Logger logger)
	{
		_logger = logger;
	}
	
}

```

---

```csharp

// 引擎類別
class Engine
{

	public void Start()
	{
		Console.WriteLine("Engine starts");
	}

}


// 車類別
class Car
{

	// Car has-a Engine
	private Engine engine;
	
	public Car()
	{
		engine = new Engine();
	}
	
	public void StartCar()
	{
		
		Console.WriteLine("Car starts");
		
		engine.Start(); // 使用組合的物件功能
	
	}

}

  

class Program
{

	static void Main()
	{
	
		Car myCar = new Car();
		myCar.StartCar();
	
	}

}

  
  

```


  

### 組合（Composition） → 低耦合（Loosely Coupled）


- 類別之間透過「擁有」關係互動，而不是繼承
- 只依賴對方的介面或功能，而不是內部實作
- 優點：靈活、容易替換或修改
- 缺點：需要額外的封裝（可能多寫一些 getter/setter 或方法呼叫）

```csharp

class Engine

{

public void Start() {

Console.WriteLine("Engine starts");

}

}

  

class Car

{

private Engine engine; // 低耦合

  

public Car(Engine engine) {

this.engine = engine;

}

  

public void StartCar() {

engine.Start();

}

}

  

```

  

如果 Engine 改變內部實作，只要介面不變，Car 不需要改


---
  
## 總結：

- 繼承 → 高耦合 → 適合「is-a」且父類別穩定

- 組合 → 低耦合 → 適合「has-a」且需要彈性或可替換性

---

## 比較 Composition 與 Interface

| 概念                   | 定義                                                    |
| -------------------- | ----------------------------------------------------- |
| **Composition (組合)** | 將一個物件作為另一個物件的成員來使用，也就是 **has-a 關係**。強調「物件之間低耦合、重用性高」。 |
| **Interface (介面)**   | 定義一組方法簽名，**不包含實作**。強調「規範一個物件應該做什麼」，讓不同類別可以互換。         |


## OOP 層級
- Composition → 是 物件之間的結構關係（誰包含誰）。
- Interface → 是 類別的契約（誰必須實作哪些方法）。

## 觀念速查
- [composition與inheritance的差異](https://www.udemy.com/course/csharp-intermediate-classes-interfaces-and-oop/learn/lecture/2243560#overview)
