
## 定義 DLL (Dynamic Link Library)

- DLL 是 動態連結函式庫（Dynamic Link Library）
- 它是一個 封裝好的程式庫，裡面可以包含：
		- 類別 (Class)
		- 方法 (Method)
		- 常數或資源檔 (Resource)
		- 不能自己執行，必須被應用程式或其他 DLL 引用。

### 與封裝 (Encapsulation) 的關係

- DLL 就像把封裝好的 class / 方法打包成黑盒子：
	- 內部實作（private/protected）被隱藏
	- 對外接口（public）被公開給外部使用
	
- 好處：
	1. 模組化：把功能分裝成獨立單位
	2. 可重複使用：不同程式可以引用同一 DLL
	3. 保護內部邏輯：外部程式只能透過公開接口操作
	 
	
### 依賴關係
	
- 被引用：應用程式 EXE 或其他 DLL
- 依賴：其他 DLL 或 .NET 框架庫
- 比喻：
- [應用程式 EXE] --> [MyLibrary.dll] --> [System.dll / 第三方 DLL]


### 關聯筆記
- 對應[[封裝]]
- 對應 [[模組化]]
- 對應 [[外部函式庫]] / [[NuGet 套件]]