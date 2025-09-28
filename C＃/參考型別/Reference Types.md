#型別 

## 什麼是 Reference Type

- Reference Type（參考型別）是一種存放 **物件參考（Reference）** 的型別，而不是直接存放資料值。

- 在記憶體上，Reference Type 的變數本身只存放一個指向物件的地址（指向堆積區 Heap 的位置）。

- 修改物件內容會影響所有持有該參考的變數。

  
## 常見的 Reference Type

- [[class 與物件操作]]
- [[interface]]
- [[delegate]]
- [[object]]
- [[string]]
- [[array]]

  

> 注意1：雖然 `string` 看起來像值型別，實際上它是 **immutable reference type**（不可變參考型別）。


>  注意2：釐清易混淆點

- Array：Reference Type，可直接修改內容。

- String：Reference Type，但 immutable；修改操作會生成新物件。

- 方法傳參考 vs 修改物件內容：

1. Array → 方法內修改內容會影響外部。

2. String → 方法內重新賦值不影響外部。



## 與 Value Type 的比較

  

| 特性 | Value Type | Reference Type |

|----------------------|---------------------------|--------------------------------|

| 存放位置 | Stack（或包含在 Heap 中） | Heap（變數存 Stack，資料存 Heap） |

| 資料傳遞 | Copy 值 | Copy 參考 |

| 修改影響 | 不影響其他變數 | 影響持有同一物件的變數 |

| 預設初始化值 | 型別預設值（例如 `0`） | `null` |

| 可以為 null | ❌ | ✅ |

  

## 用詞釐清

- **Reference / 參考**

指的是指向物件的「地址」，不是物件本身。

- **Heap / 堆積區**

存放物件資料的記憶體區域，由垃圾回收（GC）管理。

- **Stack / 堆疊區**

存放方法呼叫、局部變數與參考本身的區域。

- **Immutable / 不可變**

物件建立後內容不可更改（例：`string`），即使是 Reference Type。

  

## 小提醒

- 當 Reference Type 變數賦值給另一個變數時，**兩個變數指向同一個物件**。

- 對 Reference Type 使用 `==` 比較的是「是否指向同一物件」，而不是內容是否相等（除非重載 `Equals`）。