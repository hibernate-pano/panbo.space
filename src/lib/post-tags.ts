import type { CollectionEntry } from 'astro:content'
import { sanitizeSlug } from './slug'

type PostEntry = CollectionEntry<'posts'>

type InferredTagRule = {
  tag: string
  patterns: RegExp[]
}

const trackLikeTags = new Set(['engineering', 'thinking', 'philosophy', 'work', '工程实践', '思考', '哲学', '工作现场'])
const ignoredPathSegments = new Set(['engineering', 'thinking', 'philosophy', 'work'])

const canonicalTagAliases = new Map([
  ['nosql', 'NoSQL'],
  ['oauth20', 'OAuth 2.0'],
  ['oauth2', 'OAuth 2.0'],
  ['jwt', 'JWT'],
  ['rbac', 'RBAC'],
  ['abac', 'ABAC'],
  ['mtls', 'mTLS'],
  ['jvm', 'JVM'],
  ['cicd', 'CI/CD'],
  ['gitops', 'GitOps'],
  ['argocd', 'Argo CD'],
  ['bigdata', 'Big Data'],
  ['hikari', 'HikariCP'],
  ['hikaricp', 'HikariCP'],
  ['apm', 'APM'],
  ['k8s', 'Kubernetes'],
  ['servicemesh', 'Service Mesh'],
  ['rediscell', 'Redis Cell'],
  ['geohash', 'GeoHash'],
  ['reactrouter', 'React Router'],
  ['reactrouterv6', 'React Router'],
  ['opentelemetry', 'OpenTelemetry'],
  ['skywalking', 'SkyWalking'],
  ['zookeeper', 'ZooKeeper'],
  ['ddd', 'DDD'],
  ['tcc', 'TCC'],
  ['saga', 'Saga'],
  ['2pc', '2PC'],
])

const inferredTagRules: InferredTagRule[] = [
  { tag: '银发经济', patterns: [/银发经济|老龄化|养老/u] },
  { tag: '时间银行', patterns: [/时间银行/u] },
  { tag: '退休', patterns: [/退休/u] },
  { tag: '人际关系', patterns: [/人际关系/u] },
  { tag: '叔本华', patterns: [/叔本华/u] },
  { tag: '尼采', patterns: [/尼采/u] },
  { tag: '东方哲学', patterns: [/东方哲学/u] },
  { tag: 'JVM', patterns: [/\bjvm\b/i] },
  { tag: 'DDD', patterns: [/\bddd\b|领域驱动设计/i] },
  { tag: '集合框架', patterns: [/集合框架|collection framework|arraylist|hashmap|concurrenthashmap/i] },
  { tag: '并发编程', patterns: [/并发|reentrantlock|synchronized|semaphore|countdownlatch|cyclicbarrier|readwritelock/i] },
  { tag: 'Spring Boot', patterns: [/spring\s*boot|springboot/i] },
  { tag: 'Spring Security', patterns: [/spring\s*security|springsecurity/i] },
  { tag: 'OAuth 2.0', patterns: [/oauth\s*2(?:\.0)?|oauth2/i] },
  { tag: 'JWT', patterns: [/\bjwt\b/i] },
  { tag: 'RBAC', patterns: [/\brbac\b/i] },
  { tag: 'ABAC', patterns: [/\babac\b/i] },
  { tag: 'mTLS', patterns: [/\bmtls\b/i] },
  { tag: '微服务', patterns: [/微服务|spring\s*cloud|springcloud/i] },
  { tag: 'Docker', patterns: [/\bdocker\b/i] },
  { tag: 'NoSQL', patterns: [/\bnosql\b/i] },
  { tag: 'GeoHash', patterns: [/\bgeohash\b/i] },
  { tag: 'ShardingSphere', patterns: [/shardingsphere/i] },
  { tag: 'Redis Cell', patterns: [/redis[\s-]*cell/i] },
  { tag: 'TypeScript', patterns: [/\btypescript\b/i] },
  { tag: 'React Router', patterns: [/react\s*router/i] },
  { tag: '自定义 Hook', patterns: [/自定义\s*hook|custom hook/i] },
  { tag: 'Big Data', patterns: [/大数据|bigdata|hadoop|spark|flink|hive|mapreduce/i] },
  { tag: 'Kafka', patterns: [/\bkafka\b/i] },
  { tag: 'Flink', patterns: [/\bflink\b/i] },
  { tag: 'Spark', patterns: [/\bspark\b/i] },
  { tag: 'Hadoop', patterns: [/\bhadoop|hdfs/i] },
  { tag: 'MapReduce', patterns: [/mapreduce/i] },
  { tag: 'Hive', patterns: [/\bhive\b/i] },
  { tag: '分布式事务', patterns: [/分布式事务|\bsaga\b|\btcc\b|\b2pc\b|seata/i] },
  { tag: 'Saga', patterns: [/\bsaga\b/i] },
  { tag: 'TCC', patterns: [/\btcc\b/i] },
  { tag: '2PC', patterns: [/\b2pc\b/i] },
  { tag: 'Seata', patterns: [/\bseata\b/i] },
  { tag: 'RabbitMQ', patterns: [/rabbitmq/i] },
  { tag: 'ZooKeeper', patterns: [/zookeeper/i] },
  {
    tag: '可观测性',
    patterns: [/可观测性|observability|opentelemetry|skywalking|apm|prometheus|grafana|elk|jaeger/i],
  },
  { tag: 'OpenTelemetry', patterns: [/opentelemetry/i] },
  { tag: 'SkyWalking', patterns: [/skywalking/i] },
  { tag: 'Prometheus', patterns: [/prometheus/i] },
  { tag: 'Grafana', patterns: [/grafana/i] },
  { tag: 'ELK', patterns: [/\belk\b/i] },
  { tag: 'Jaeger', patterns: [/jaeger/i] },
  { tag: '配置中心', patterns: [/配置中心|apollo|nacos/i] },
  { tag: 'Apollo', patterns: [/\bapollo\b/i] },
  { tag: 'Nacos', patterns: [/\bnacos\b/i] },
  { tag: '流量治理', patterns: [/限流|熔断|降级|sentinel/i] },
  { tag: 'Sentinel', patterns: [/\bsentinel\b/i] },
  { tag: 'API 设计', patterns: [/rest api|api 版本|版本管理/i] },
  { tag: 'Git', patterns: [/\bgit\b|git工作流/u] },
  { tag: 'CI/CD', patterns: [/ci\/cd|流水线|azure devops/i] },
  { tag: 'GitOps', patterns: [/gitops|argocd/i] },
  { tag: 'Argo CD', patterns: [/argocd/i] },
  { tag: 'Terraform', patterns: [/terraform/i] },
  { tag: 'Istio', patterns: [/\bistio\b/i] },
  { tag: 'Service Mesh', patterns: [/service mesh|servicemesh/i] },
  { tag: 'Vault', patterns: [/hashicorp vault|\bvault\b/i] },
  { tag: '银行系统', patterns: [/银行系统|银行级|银行科技|银行业|支付系统/u] },
  { tag: 'HSBC', patterns: [/\bhsbc\b|汇丰/u] },
]

const normalizeKey = (value: string): string => sanitizeSlug(value).replace(/-/g, '')

const canonicalizeTag = (value: string): string | null => {
  const cleaned = value.normalize('NFKC').replace(/^#+/u, '').trim().replace(/\s+/g, ' ')
  if (!cleaned) return null

  const alias = canonicalTagAliases.get(normalizeKey(cleaned))
  return alias ?? cleaned
}

const stripEpisodePrefix = (title: string): string => title.replace(/^\d{2}[-—–_.:：\s]*/u, '').trim()

const stripCodeBlocks = (value: string): string => value.replace(/```[\s\S]*?```/g, ' ')

const extractMarkdownHeadings = (body: string): string[] => {
  const headings: string[] = []
  let inFence = false

  for (const line of body.split('\n')) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence
      continue
    }

    if (inFence) continue

    const match = line.match(/^#{2,3}\s+(.+)$/u)
    if (!match) continue

    headings.push(match[1].replace(/\[[^\]]+\]\([^)]+\)/g, '$1').trim())
  }

  return headings
}

const extractIntroHashtags = (body: string): string[] => {
  const intro = body.split(/\n##\s/iu, 1)[0] ?? body
  const hashtags: string[] = []

  for (const line of stripCodeBlocks(intro).split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('#') || trimmed.includes('](')) continue

    const matches = trimmed.matchAll(/(?:^|[\s(（【])#(?!\s)([\p{Script=Han}\p{Letter}\p{Number}_+-]{2,32})/gu)
    for (const match of matches) {
      if (match[1]) hashtags.push(match[1])
    }
  }

  return hashtags
}

const extractAboutTag = (title: string): string[] => {
  const aboutMatch = stripEpisodePrefix(title).match(/^关于(.{1,12})$/u)
  if (!aboutMatch) return []
  return [aboutMatch[1]]
}

const collectPathTags = (post: PostEntry): string[] =>
  post.id
    .split('/')
    .slice(0, -1)
    .map((segment) => segment.trim())
    .filter((segment) => segment && !ignoredPathSegments.has(segment))

const buildInferenceText = (post: PostEntry): string => {
  const headings = extractMarkdownHeadings(post.body ?? '')

  return [
    post.data.title,
    post.data.summary,
    post.data.topic,
    post.data.series,
    ...collectPathTags(post),
    ...headings.slice(0, 12),
  ]
    .filter(Boolean)
    .join('\n')
}

const inferTagsFromRules = (text: string): string[] =>
  inferredTagRules.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map((rule) => rule.tag)

const isNoiseTag = (tag: string, post: PostEntry): boolean => {
  const normalizedTag = normalizeKey(tag)

  if (!normalizedTag) return true
  if (trackLikeTags.has(tag) || trackLikeTags.has(normalizedTag)) return true
  if (/^[0-9a-f]{3,8}$/iu.test(tag)) return true

  const duplicateTargets = [post.data.topic, post.data.series].filter(Boolean) as string[]
  return duplicateTargets.some((value) => normalizeKey(value) === normalizedTag)
}

const pushTag = (tags: string[], value: string, post: PostEntry) => {
  const tag = canonicalizeTag(value)
  if (!tag || isNoiseTag(tag, post)) return
  if (tags.some((existing) => normalizeKey(existing) === normalizeKey(tag))) return
  tags.push(tag)
}

export const getPostTags = (post: PostEntry, limit?: number): string[] => {
  const tags: string[] = []
  const inferenceText = buildInferenceText(post)

  for (const value of post.data.tags) pushTag(tags, value, post)
  for (const value of extractIntroHashtags(post.body ?? '')) pushTag(tags, value, post)
  for (const value of collectPathTags(post)) pushTag(tags, value, post)
  for (const value of extractAboutTag(post.data.title)) pushTag(tags, value, post)
  for (const value of inferTagsFromRules(inferenceText)) pushTag(tags, value, post)

  return typeof limit === 'number' ? tags.slice(0, limit) : tags
}

export const getVisiblePostTags = (post: PostEntry, limit = 3): string[] => getPostTags(post, limit)

export const toTagSlug = (tag: string): string => sanitizeSlug(tag)

export const toTagPath = (tag: string): string => `/tags/${toTagSlug(tag)}`

export const formatTagLabel = (tag: string): string => `#${tag}`
