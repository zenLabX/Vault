#OOP #低耦合 #高耦合 


C# 中的耦合 (Coupling)：緊密耦合與鬆散耦合

這份筆記將探討物件導向程式設計中的一個核心概念：耦合 (Coupling)。理解耦合對於編寫可維護、可擴展和可測試的程式碼至關重要，尤其在學習 ASP.NET Core MVC 這樣的框架時，它與依賴注入 (Dependency Injection) 的概念緊密相連。

## 什麼是耦合？

耦合描述的是兩個或多個模組之間相互依賴的程度。當一個模組的變更需要另一個模組也跟著變更時，它們之間就存在耦合。

  
- **高耦合 (High Coupling)**：模組之間相互依賴性強，一個模組的變動會對其他模組產生較大影響。

- **低耦合 (Low Coupling)**：模組之間相互依賴性弱，一個模組的變動對其他模組影響較小。

  

在設計軟體時，我們通常追求==低耦合==，以提高程式碼的靈活性、可維護性和可測試性。

---

## 緊密耦合 (Tightly Coupled)


當一個類別直接依賴於另一個具體的類別實作時，就產生了緊密耦合。這種情況下，如果被依賴的類別發生變更，依賴它的類別很可能也需要修改。這會使得程式碼難以維護和擴展。

  
以下是 `Coupling/TightlyCoupled.cs` 中的範例，展示了一個緊密耦合的設計：

```csharp

namespace TightlyCoupled
{

	public class OrderService
	{
		// OrderService 直接依賴具體的 CreditCardPayment 類別
		private CreditCardPayment _payment;
		
		public OrderService()
		{
			// 在建構函式中直接建立具體類別的實例，形成強烈綁定
			_payment = new CreditCardPayment();
		}
		
		
		public void Checkout()
		{
			// OrderService 呼叫 CreditCardPayment 的 Pay 方法
			_payment.Pay(1000);
		}
	}

	public class CreditCardPayment
	{
	
		public void Pay(decimal amount)
		{
		
			Console.WriteLine($"Paid {amount} using Credit Card.");
		
		}
	
	}

}

```

  

**問題分析：**

- `OrderService` 與 `CreditCardPayment` 之間存在強烈的依賴。`OrderService` 知道 `CreditCardPayment` 的所有細節。

- 如果我們需要更換支付方式 (例如改成 PayPalPayment)，我們必須修改 `OrderService` 的程式碼，這違反了「開閉原則」(Open/Closed Principle)。

- 測試 `OrderService` 時，我們無法輕易地替換 `CreditCardPayment` 的實作 (例如使用模擬物件)，使得單元測試變得困難。



## 鬆散耦合 (Loosely Coupled)

  

==為了實現鬆散耦合，我們通常會引入抽象層 (例如介面或抽象類別)==。依賴倒轉原則 (Dependency Inversion Principle) 建議高層模組不應依賴低層模組，兩者都應依賴抽象。抽象不應依賴細節，細節應依賴抽象。


以下是 `Coupling/LooselyCoupled.cs` 中的範例，展示了如何透過介面和依賴注入實現鬆散耦合：

```csharp

namespace LooselyCoupled

{

	// 1. 定義抽象介面 (Interface)，定義支付的契約
	public interface IPayment
	{
		void Pay(decimal amount);
	}

  
	// 2. OrderService 只依賴於抽象介面 IPayment，不依賴具體實作
	public class OrderService
	{
		private readonly IPayment _payment;
		
		// 透過建構函式注入 IPayment 的實作 (依賴注入)
		public OrderService(IPayment payment)
		{
			_payment = payment;
		}
		
		public void Checkout()
		{
			_payment.Pay(1000);
		}
	
	}

  

	// 3. 各種支付方式實作 IPayment 介面
	public class CreditCardPayment : IPayment
	{
	
		public void Pay(decimal amount)
		{
		
			Console.WriteLine($"Paid {amount} using Credit Card.");
		
		}
	
	}

  

	public class PaypalPayment : IPayment
	{
	
		public void Pay(decimal amount)
		{
		
			Console.WriteLine($"Paid {amount} using PayPal.");
		
		}
	
	}

}

```

  

**優點分析：**

- `OrderService` 不再知道具體支付方式的細節，它只知道如何透過 `IPayment` 介面進行支付。這使得 `OrderService` 更加靈活。

- **可擴展性**：如果需要新增一種支付方式 (例如 BitcoinPayment)，只需建立一個新的類別來實作 `IPayment` 介面，而不需要修改 `OrderService` 的程式碼。

- **可測試性**：在測試 `OrderService` 時，我們可以注入一個模擬 (mock) 的 `IPayment` 實作，輕鬆地測試 `OrderService` 的邏輯，而不需要真正執行支付操作。

- **依賴注入 (Dependency Injection, DI)**：透過建構函式將 `IPayment` 的實作 (`CreditCardPayment` 或 `PaypalPayment`) 傳入 `OrderService`，這種方式稱為依賴注入。它讓類別的依賴關係在外部被解決，而不是在類別內部自行建立。

  

## 緊密耦合 vs. 鬆散耦合：對比總結

| 特性 | 緊密耦合 | 鬆散耦合 |
|--------------|--------------------------------|------------------------------------|
| 靈活性 | 差，難以更換依賴模組 | 高，容易替換依賴模組 |
| 可維護性 | 差，一個變動可能影響多處 | 高，模組獨立，變動影響範圍小 |
| 可擴展性 | 差，新增功能需修改現有程式碼 | 高，透過實作介面即可擴展 |
| 可測試性 | 差，難以進行單元測試 | 高，容易進行單元測試 (可注入模擬) |
| 程式碼重用性 | 差 | 高 |

---

## 與 ASP.NET Core MVC 的關聯


在 ASP.NET Core MVC 應用程式中，控制器 (Controllers) 通常會依賴於各種服務 (Services) 來執行業務邏輯。ASP.NET Core 內建了強大的依賴注入容器，鼓勵開發者採用鬆散耦合的設計。


- 控制器會透過建構函式注入其所需的服務介面 (例如 `IProductService`, `IUserRepository`)，而不是直接建立這些服務的具體實例。

- 這樣設計使得控制器與服務的具體實作解耦，方便測試、替換服務實作，並提高整個應用程式的彈性。


理解耦合和依賴注入是掌握 ASP.NET Core MVC 開發的關鍵基礎之一。