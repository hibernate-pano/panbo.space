---
date created: 2022-11-22 10:05
---

#NoSQL #Redis #数据库

## 字符串 String

二进制安全，可以保存图片和序列化对象；
value 中的字符串最大长度为**512M**；

### 基本命令

- `set <key>` 添加键值对；
- `get <key>` 获取 key 对应值；
- `append <key> <value>` **追加字符串到值的末尾，返回拼接后的总长度；**
- `strlen <key>` 获取值的长度；
- `setnx <key> <value>` 只有当 key 不存在时，才能设置值（此处可以利用实现分布式锁）；
- `incr <key> / decr <key>` 将 key 值+1/-1，**只能对数字操作**，如为空，则新增值为 1；
- `incrby / decrby <key> <step>` 将 key 值增加/减少对应的步长，**只能对数字操作**；

### 数据结构

字符串底层结构类似于 Java 的 ArrayList，有一个动态扩容的机制；
**给字符串类型的分配空间高于实际字符串长度**

1. 当字符串长度小于 1M 时，扩容的空间翻倍；
2. 当字符串长度大于 1M 时，扩容的空间比实际长度多 1M；

## 列表 List

单键多值；
Redis 列表是一个简单的字符串列表，按照插入顺序排序，可以添加一个元素到列表的头部或者尾部；
底层是一个双向链表，添加删除的性能高，查询性能低；

### 常用命令

`lpush / rpush <key> <value1> <value2> <value3>...` 从左边或者右边插入一个或多个值；
`lpop / rpop <key>` 从左边或者右边吐出一个值。返回当前值，然后从列表中删除此值。**当 key 没有值的时候，key 清除**
`rpoplpush <key1> <key2>` 这个一个操作，从 key1 列表右侧吐出一个值然后插入到 key2 列表的左侧；
`lrange <key> <start> <stop>` 按照索引下标获取元素（从左到右）（-1 代表最大长度，或者说最右一个）；
`lindex <key> <index>` 按照索引下标获取元素（从左到右）（-1 代表最右）；
`llen <key>` 获取列表长度；
`linsert <key> before / after <value> <new value>` 在 value 的前面 / 后面插入 newvalue 值；
`lrem <key> <n> <value>` 从左边删除 n 个 value（从左到右）；
`iset <key> <index> <value>` 将列表 key 下标为 index 的值替换成 value；

### 数据结构

List 的数据结构为快速链表[[quicklist 快速列表|quicklist 快速列表]]；

## 集合 Set

和 list 功能类似；
Set 自动排重；List 列表内允许重复；
Set 提供判断某个成员是否在 Set 集合内的接口；
Set 底层是 String 类型的无序集合，其实是**一个 value 为 null 的 hash 表**，所以添加、删除、查找的复杂度都是 O(1)；

### 常用命令

`sadd <key> <value1> <value2> <value3>..` 将一个或者多个 member 元素加入到集合 key 中，已经存在的 member 元素将被**忽略**；
`smember <key>` 取出该集合的所有值；
`sismember <key> <value>` 判断集合 key 中是否含有该 value 值，有返回 1，没有返回 0；
`scard <key>` 返回集合 key 的个数；
`srem <key> <value1> <value2>...` 删除集合中的某个或某些元素；
`spop <key>` 随机从该集合中吐出一个值；
`srandmember <key> <n>` 随机从集合 key 中取出 n 个值，不会从集合中删除；
`smove <source> <destination> <value>` 把集合中的值 value 从集合 source 移动到集合 destination；
`sinter <key1> <key2>` 返回两个集合的交集；
`sunion <key1> <key2>` 返回两个集合的并集；
`sdiff <key1> <key2>` 返回两个集合的差集元素，key1 中存在 key2 中不存在的；

### 数据结构

**Set 的底层数据结构是 dict 字典，使用 hash 表实现；**

Java 中的 HashSet 的内部实现使用的是 HashMap，只不过所有的 value 都指向同一个对象；同理，Redis 的 Set 结构也是一样，内部也使用的是 Hash 结构，所有的 value 都指向同一个内部值；

## 有序集合 ZSet

和 Set 相似，是一个自动排重的集合；
和 Set 不同之处在于每个成员都关联了一个评分（`score`），可以用来排序；
集合的成员是唯一的，但是评分可以重复；

### 常用命令

`zadd <key> <score1> <value1> <score2> <value2>...` 将一个或多个 member 元素及其 score 值加入到有序集合 key 当中；
`zrange <key> <start> <end> [withscores]` 按照插入顺序获取 ZSet 中的值，[withscores] 加上还会获取到他们的 scores；
`zrangebyscore <key> <min> <max> [withscores][limit offset count]` 返回有序集合 key 中所有 score 值介于 min 和 max 之间的元素（及其 score）；**按照 score 值从小到大排列**；limit 为限定个数；
`zrevrangebyscore <key> <min> <max> [withscores][limit offset count]` 返回有序集合 key 中所有 score 值介于 min 和 max 之间的元素（及其 score）；**按照 score 值从大到小排列**；
`zincryby <key> <increment> <value>` 为集合 key 中值为 value 的 score 加上 increment；
`zrem <key> <value>` 删除集合 key 中值为 value 的元素；
`zcount <key> <min> <max>` 统计集合 key，分数在 min 和 max 之间的元素个数；
`zrank <key> <value>` 返回 value 值在集合 key 中的排名，从 0 开始；

### 数据结构

ZSet 是 Redis 提供的特殊的数据结构；

底层数据结构有两个：

1. Hash，作用是关联元素 value 和 score，保障元素的唯一性，可以通过 value 找到 score 的值；
2. [[skiplist 跳跃表|skiplist 跳表]] ，目的在于给元素 value 排序，根据 score 的范围获取元素列表；

## 哈希 Hash

Redis 的 Hash 是一个键值对集合；
Redis 的 Hash 的 value 是一个 string 类型的 field 和 value 的映射表，Hash 特别适合存储对象，类似于 Java 的 `Map<String, Object>`；
整体结构为：`key: field-value`；

### 常用命令

`hset <key> <field> <value>` 给 hash 表 key 中的 field 键赋值；
`hget <key> <field>` 从 hash 表 key 中获取 field 键的值；
`hmset <key> <field1> <value1> <field2> <value2>...` 批量设置 hash 的值；
`hexists <key> <field>` 查询 hash 表 key 中，给定域 field 是否存在；
`hkeys <key>` 列出该 hash 集合的所有的 field；
`hvals <key>` 列出该 hash 集合的所有 value；
`hincrby <key> <field> <increment>` 为 hash 表 key 中的域 field 的值增加 increment；
`hsetnx <key> <field> <value>` 为 hash 表 key 中的域 field 设置值为 value，当且仅当域 field 不存在时执行，否则不执行；

### 数据结构

Hash 类型对应的数据结构有两种，[[ziplist 压缩列表]]（压缩列表)和 hashtable（哈希表），当 field-value 长度较短且个数较少时，使用 ziplist，否则使用 hashtable；
