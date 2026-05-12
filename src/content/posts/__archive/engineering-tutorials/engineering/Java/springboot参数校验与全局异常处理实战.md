---
title: Spring Boot 参数校验与全局异常处理实战
summary: 从 @Validated 到全局异常处理器，详解 Spring Boot 企业级输入校验体系设计与实现，涵盖分组校验、自定义校验器、统一错误响应。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: Java
tags: []
featured: false
draft: false
slug: springboot参数校验与全局异常处理实战
legacyPaths:
  - /coding/Java/SpringBoot参数校验与全局异常处理实战
---
> "参数校验是 API 的第一道防线。每一个没有校验的参数，都是一颗等待爆炸的地雷。"

## 前言

在银行系统里，参数校验的重要性远超一般互联网应用：

- **金额字段**：不能为负数，不能超过单笔限额，不能有小数点后超过 2 位
- **账号字段**：必须符合 IBAN/账号格式校验
- **日期字段**：不能是未来日期（有些业务），不能早于账户开户日
- **枚举字段**：必须是合法的状态码

不规范的项目里，这套校验逻辑散落在 Controller、Service、DAO 各层，既容易遗漏，又难以维护。

## 1. 基础：Bean Validation 注解

Spring Boot 通过 Hibernate Validator 实现 Bean Validation 2.0（JSR-380）：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

```java
@Data
public class PaymentRequest {
    @NotBlank(message = "订单号不能为空")
    private String orderId;

    @NotNull(message = "金额不能为空")
    @DecimalMin(value = "0.01", message = "金额最小为 0.01")
    @DecimalMax(value = "1000000.00", message = "单笔金额不能超过 100 万")
    @Digits(integer = 7, fraction = 2, message = "金额格式不正确")
    private BigDecimal amount;

    @NotBlank(message = "收款账号不能为空")
    @Size(min = 10, max = 34, message = "账号格式不正确")
    private String toAccount;

    @NotBlank(message = "币种不能为空")
    @Pattern(regexp = "^(CNY|USD|HKD|EUR|GBP)$", message = "暂不支持该币种")
    private String currency;

    @Email(message = "邮箱格式不正确")
    private String notificationEmail;

    @Past(message = "出生日期不能是未来时间")
    private LocalDate birthDate;

    @Min(value = 18, message = "年龄必须大于等于 18")
    private Integer age;
}
```

### 1.1 常用校验注解一览

| 注解 | 适用类型 | 用途 |
|------|---------|------|
| `@NotNull` | 全部 | 不能为 null |
| `@NotBlank` | String | 不能为空字符串 |
| `@NotEmpty` | Collection/Map | 不能为空 |
| `@Size` | String/Collection | 长度/大小限制 |
| `@Length` | String | 字符串长度（ Hibernate 专有） |
| `@Min / @Max` | 数字 | 数值最小/最大值 |
| `@DecimalMin / @DecimalMax` | BigDecimal | 精确小数比较 |
| `@Digits` | 数字 | 整数位和小数位精度 |
| `@Pattern` | String | 正则表达式 |
| `@Email` | String | 邮箱格式 |
| `@URL` | String | URL 格式 |
| `@Past / @Future` | Date/Time | 过去/未来时间 |
| `@AssertTrue` | boolean | 自定义布尔断言 |

## 2. Controller 启用校验

```java
@RestController
@RequestMapping("/api/v1/payments")
@Slf4j
public class PaymentController {

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createPayment(
            @Valid @RequestBody PaymentRequest request,
            BindingResult bindingResult) {

        // ❌ 错误做法：手动判断校验结果
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("参数校验失败"));
        }

        // 业务逻辑...
        return ResponseEntity.ok(ApiResponse.success());
    }
}
```

**正确做法**：使用 `@Validated` 在类级别声明，用全局异常统一处理校验错误：

```java
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody PaymentRequest request) {
        // 无需手动判断，全局异常处理器自动处理
        PaymentResponse response = paymentService.createPayment(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

## 3. 全局异常处理器

这是整个校验体系的核心：

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // 1. 处理 @Valid 校验失败
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(
            MethodArgumentNotValidException ex) {

        // 收集所有校验错误
        List<String> errors = ex.getBindingResult().getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .toList();

        log.warn("参数校验失败: {}", errors);

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error("VALIDATION_ERROR", "参数校验失败", errors));
    }

    // 2. 处理路径参数/查询参数校验
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(
            ConstraintViolationException ex) {

        List<String> errors = ex.getConstraintViolations()
            .stream()
            .map(v -> v.getPropertyPath() + ": " + v.getMessage())
            .toList();

        log.warn("约束校验失败: {}", errors);

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error("VALIDATION_ERROR", "参数不合法", errors));
    }

    // 3. 处理嵌套对象校验
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {

        String message = String.format("参数 '%s' 类型错误，期望 %s",
            ex.getName(),
            ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "未知");

        return ResponseEntity.badRequest()
            .body(ApiResponse.error("TYPE_MISMATCH", message, null));
    }

    // 4. 统一业务异常
    @ExceptionHandler(PaymentBusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(
            PaymentBusinessException ex) {

        log.warn("业务异常: code={}, message={}", ex.getCode(), ex.getMessage());

        return ResponseEntity
            .status(HttpStatus.valueOf(ex.getHttpStatus()))
            .body(ApiResponse.error(ex.getCode(), ex.getMessage(), null));
    }

    // 5. 兜底异常
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex) {
        log.error("未知异常", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error("INTERNAL_ERROR", "系统繁忙，请稍后重试", null));
    }
}
```

### 3.1 统一响应结构

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private String code;        // 业务错误码
    private String message;     // 用户友好的消息
    private T data;             // 响应数据
    private long timestamp;     // 时间戳
    private List<String> details; // 详细错误列表（校验失败时）

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
            .code("SUCCESS")
            .message("操作成功")
            .data(data)
            .timestamp(System.currentTimeMillis())
            .build();
    }

    public static <T> ApiResponse<T> error(String code, String message, List<String> details) {
        return ApiResponse.<T>builder()
            .code(code)
            .message(message)
            .details(details)
            .timestamp(System.currentTimeMillis())
            .build();
    }
}
```

## 4. 分组校验：同一字段，不同场景不同规则

这是银行系统里最常见的需求：**创建订单时订单号可为空（系统生成），修改订单时订单号必须提供**。

```java
@Data
public class PaymentRequest {

    @NotBlank(message = "订单号不能为空", groups = {Update.class})
    private String orderId;  // 修改时必填，创建时系统生成

    @NotNull(message = "金额不能为空")
    @DecimalMin(value = "0.01", message = "金额最小为 0.01")
    private BigDecimal amount;  // 创建和修改都需要

    // 定义校验分组
    public interface Create {}
    public interface Update {}
}
```

```java
@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    // 创建场景：校验 Create 组
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createPayment(
            @Validated(PaymentRequest.Create.class)
            @RequestBody PaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // 修改场景：校验 Update 组
    @PutMapping("/{orderId}")
    public ResponseEntity<ApiResponse<Void>> updatePayment(
            @PathVariable String orderId,
            @Validated(PaymentRequest.Update.class)
            @RequestBody PaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
```

**关键点**：`@Validated` 的分组参数决定了哪些规则生效，未指定分组的规则默认在所有场景生效。

## 5. 自定义校验器

当内置注解无法满足业务规则时，自定义校验器：

```java
// 5.1 定义校验注解
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = CurrencyValidator.class)
@Documented
public @interface ValidCurrency {
    String message() default "不支持的币种";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// 5.2 实现校验逻辑
public class CurrencyValidator implements ConstraintValidator<ValidCurrency, String> {

    // HSBC 支持的币种白名单
    private static final Set<String> ALLOWED_CURRENCIES = Set.of(
        "CNY", "USD", "HKD", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD", "CHF"
    );

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;  // @NotNull 会处理空值
        }
        return ALLOWED_CURRENCIES.contains(value.toUpperCase());
    }
}

// 5.3 使用自定义注解
@Data
public class PaymentRequest {
    @ValidCurrency
    private String currency;
}
```

## 6. 银行特殊场景校验

### 6.1 IBAN 国际账号校验

```java
@Documented
@Constraint(validatedBy = IBANValidator.class)
public @interface ValidIBAN {
    String message() default "IBAN 格式不正确";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class IBANValidator implements ConstraintValidator<IBANValidator, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return true;

        // IBAN 格式：国家代码（2位）+ 校验码（2位）+ BBAN（最多30位）
        // 例如：GB82WEST12345698765432
        if (value.length() < 15 || value.length() > 34) return false;
        if (!value.substring(0, 2).matches("[A-Z]{2}")) return false;
        if (!value.substring(2, 4).matches("\\d{2}")) return false;

        // MOD-97 校验（ISO 13616）
        String rearranged = value.substring(4) + value.substring(0, 4);
        String numeric = convertToNumeric(rearranged);
        return new BigInteger(numeric).mod(BigInteger.valueOf(97)).intValue() == 1;
    }

    private String convertToNumeric(String str) {
        StringBuilder sb = new StringBuilder();
        for (char c : str.toCharArray()) {
            if (Character.isDigit(c)) {
                sb.append(c);
            } else {
                sb.append(c - 'A' + 10);  // A=10, B=11, ...
            }
        }
        return sb.toString();
    }
}
```

### 6.2 业务规则校验：双重金额校验

银行系统里金额字段需要双重校验：

```java
@Data
public class PaymentRequest {
    // 数值校验：数据库字段层面
    @NotNull
    @DecimalMin(value = "0.01")
    @DecimalMax(value = "1000000.00")
    @Digits(integer = 7, fraction = 2)
    private BigDecimal amount;

    // 格式校验：前端传的是字符串，防止精度丢失
    @Pattern(regexp = "^\\d{1,7}(\\.\\d{1,2})?$",
             message = "金额格式错误")
    private String amountStr;

    // 签名校验：防止中间人篡改
    @NotBlank
    private String amountSignature;  // RSA 签名
}
```

## 7. 参数校验的避坑指南

```
避坑点 1：@Valid 和 @Validated 的区别
  @Valid：标准 JSR-303 注解，不支持分组
  @Validated：Spring 的增强版，支持分组和类级别校验

避坑点 2：空字符串不会被 @NotBlank 拦截
  @NotBlank("  ") = false，但需要额外处理空格 trim

避坑点 3：嵌套对象的校验
  @Valid @RequestBody Outer outer
  如果 Outer.inner 没有 @Valid，嵌套对象的校验会被跳过

避坑点 4：校验顺序
  Hibernate Validator 按字段声明顺序校验
  重要字段放前面，用户先看到主要错误

避坑点 5：国际化消息
  messages.properties:
    NotBlank={0} 不能为空
    DecimalMin={0} 必须大于等于 {1}
  {0} = 字段名，{1},{2}... = 注解参数
```

---

*相关阅读：[Spring Boot 数据库连接池调优](/coding/Java/SpringBoot数据库连接池调优) · [Spring Security 与 OAuth2 银行级安全](/coding/架构心得/SpringSecurity与OAuth2银行级安全实战) · [项目稳定性-幂等性设计](/coding/架构心得/项目稳定性-幂等)*
