#高耦合 

繼承與組合概念似乎都是一起講的，這兩者容易搞混，雖然有不同之處，但繼承與組合都達到程式碼重複使用 (code re-use) 的目的。

繼承就是一個類別（class）可以「延伸」另一個類別，取得它的屬性（fields/properties）和方法（methods），不用重新寫一遍。

- ==is-a== →
- Dog is a Animal
- Car is a Vehicle


```csharp

class Animal
{

	public void Eat() {
	
		Console.WriteLine("Eating");
	
	}

}



class Dog : Animal // Dog 繼承 Animal
{

	public void Bark() {
	
		Console.WriteLine("Barking");
	
	}

}
  

```

### 繼承（Inheritance） → 高耦合（Tightly Coupled）

- 子類別依賴父類別的實作細節
- 父類別改變時，子類別也可能需要修改
- 優點：程式碼重用方便
- 缺點：靈活性低、耦合度高

```csharp

class Animal

{

public void Eat() {

Console.WriteLine("Eating");

}

}

  

class Dog : Animal // 高耦合

{

public void Bark() {

Console.WriteLine("Barking");

}

}

  

```

  

如果 Animal 改 Eat() 實作，Dog 可能受影響