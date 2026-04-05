export interface DiagramTemplate {
  id: string
  name: string
  description: string
  icon: string
  code: string
}

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Process flows, decision trees',
    icon: '⬡',
    code: `flowchart TD
    A([Start]) --> B[/Read Input/]
    B --> C{Valid?}
    C -->|Yes| D[Process Data]
    C -->|No| E[Show Error]
    E --> B
    D --> F[(Save to DB)]
    F --> G([End])

    style A fill:#6366f1,color:#fff,stroke:none
    style G fill:#6366f1,color:#fff,stroke:none
    style C fill:#f59e0b,color:#fff,stroke:none`,
  },
  {
    id: 'sequence',
    name: 'Sequence',
    description: 'Interactions between actors',
    icon: '↔',
    code: `sequenceDiagram
    actor U as User
    participant C as Client
    participant A as API
    participant DB as Database

    U->>C: Click "Login"
    C->>A: POST /auth/login
    A->>DB: Query user record
    DB-->>A: User found
    A-->>C: 200 JWT token
    C-->>U: Redirect to dashboard

    Note over A,DB: Credentials verified
    Note over C: Token stored in localStorage`,
  },
  {
    id: 'classDiagram',
    name: 'Class Diagram',
    description: 'OOP structure and relationships',
    icon: '⬜',
    code: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() String
        +move() void
    }

    class Dog {
        +String breed
        +fetch() void
        +makeSound() String
    }

    class Cat {
        +bool indoor
        +purr() void
        +makeSound() String
    }

    class Owner {
        +String name
        +List~Animal~ pets
        +adopt(Animal) void
    }

    Animal <|-- Dog
    Animal <|-- Cat
    Owner "1" --> "*" Animal : owns`,
  },
  {
    id: 'erDiagram',
    name: 'ER Diagram',
    description: 'Database entity relationships',
    icon: '⊞',
    code: `erDiagram
    CUSTOMER {
        int id PK
        string name
        string email
        date created_at
    }
    ORDER {
        int id PK
        int customer_id FK
        date ordered_at
        string status
    }
    PRODUCT {
        int id PK
        string name
        float price
        int stock
    }
    ORDER_ITEM {
        int order_id FK
        int product_id FK
        int quantity
        float unit_price
    }

    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "included in"`,
  },
  {
    id: 'stateDiagram',
    name: 'State Diagram',
    description: 'State machines and transitions',
    icon: '◎',
    code: `stateDiagram-v2
    [*] --> Idle

    Idle --> Loading : fetch()
    Loading --> Success : data received
    Loading --> Error : request failed
    Error --> Loading : retry()
    Error --> Idle : cancel()
    Success --> Idle : reset()
    Success --> Loading : refresh()

    state Loading {
        [*] --> Requesting
        Requesting --> Polling : async
        Polling --> [*]
    }`,
  },
  {
    id: 'gantt',
    name: 'Gantt Chart',
    description: 'Project timelines and schedules',
    icon: '▬',
    code: `gantt
    title Product Launch Timeline
    dateFormat  YYYY-MM-DD
    excludes weekends

    section Discovery
    Market Research       :done,    res1, 2024-01-01, 2024-01-15
    Competitor Analysis   :done,    res2, 2024-01-10, 10d
    User Interviews       :done,    res3, 2024-01-15, 7d

    section Design
    Wireframes            :active,  des1, 2024-01-22, 14d
    UI Design             :         des2, after des1, 21d
    Design Review         :crit,    des3, after des2, 3d

    section Development
    Backend API           :         dev1, 2024-02-05, 30d
    Frontend              :         dev2, 2024-02-12, 28d
    Integration           :crit,    dev3, after dev1, 7d

    section Launch
    Beta Testing          :crit,    qa1,  after dev3, 14d
    Public Release        :milestone, 2024-04-01, 0d`,
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Proportions and distributions',
    icon: '◔',
    code: `pie title Browser Market Share 2024
    "Chrome"    : 65.4
    "Safari"    : 18.9
    "Firefox"   : 4.0
    "Edge"      : 5.3
    "Opera"     : 2.1
    "Other"     : 4.3`,
  },
  {
    id: 'gitgraph',
    name: 'Git Graph',
    description: 'Git branch and commit history',
    icon: '⑂',
    code: `gitGraph
    commit id: "Initial commit"
    commit id: "Add README"

    branch feature/auth
    checkout feature/auth
    commit id: "Add login page"
    commit id: "Implement JWT"
    commit id: "Add refresh tokens"

    branch feature/auth-tests
    checkout feature/auth-tests
    commit id: "Unit tests"
    commit id: "Integration tests"

    checkout feature/auth
    merge feature/auth-tests id: "Merge tests"

    checkout main
    merge feature/auth id: "Merge auth" tag: "v1.1.0"

    branch hotfix/csrf
    checkout hotfix/csrf
    commit id: "Fix CSRF vuln" type: HIGHLIGHT

    checkout main
    merge hotfix/csrf id: "Security fix" tag: "v1.1.1"`,
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'Ideas, concepts and hierarchies',
    icon: '✦',
    code: `mindmap
  root((Product Strategy))
    Growth
      Acquisition
        SEO
        Paid Ads
        Referrals
      Retention
        Onboarding
        Notifications
        Loyalty Program
    Product
      Core Features
        Editor
        Export
        Collaboration
      Roadmap
        Q1 AI Integration
        Q2 Mobile App
    Team
      Engineering
        Frontend
        Backend
        DevOps
      Design
      Marketing`,
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Events across time periods',
    icon: '⟶',
    code: `timeline
    title History of the Web
    section 1990s
        1991 : World Wide Web created by Tim Berners-Lee
        1993 : Mosaic browser released
        1995 : JavaScript invented by Brendan Eich
        1996 : CSS1 specification released
    section 2000s
        2004 : Firefox 1.0 released
        2005 : AJAX popularized by Gmail & Google Maps
        2008 : Chrome browser launched
        2009 : Node.js released
    section 2010s
        2010 : HTML5 draft published
        2013 : React open-sourced by Facebook
        2014 : Vue.js created
        2017 : WebAssembly announced
    section 2020s
        2020 : Deno 1.0 released
        2021 : Vite becomes mainstream
        2023 : AI coding tools explode`,
  },
  {
    id: 'quadrantChart',
    name: 'Quadrant Chart',
    description: 'Feature prioritization matrix',
    icon: '⊕',
    code: `quadrantChart
    title Feature Prioritization Matrix
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact

    quadrant-1 Quick Wins
    quadrant-2 Major Projects
    quadrant-3 Fill-ins
    quadrant-4 Thankless Tasks

    Dark Mode: [0.2, 0.8]
    Export PDF: [0.5, 0.9]
    Collaboration: [0.85, 0.95]
    Keyboard Shortcuts: [0.15, 0.7]
    Undo History: [0.4, 0.75]
    Mobile App: [0.9, 0.6]
    Templates: [0.25, 0.65]
    API Access: [0.7, 0.8]
    Embeds: [0.55, 0.45]
    Analytics: [0.6, 0.35]`,
  },
  {
    id: 'xychart',
    name: 'XY Chart',
    description: 'Bar and line charts with axes',
    icon: '📈',
    code: `xychart-beta
    title "Monthly Revenue (USD)"
    x-axis [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
    y-axis "Revenue ($K)" 0 --> 120
    bar  [32, 41, 55, 48, 63, 72, 68, 85, 91, 78, 95, 112]
    line [32, 41, 55, 48, 63, 72, 68, 85, 91, 78, 95, 112]`,
  },
  {
    id: 'architecture',
    name: 'Architecture',
    description: 'System architecture diagrams (beta)',
    icon: '🏗️',
    code: `architecture-beta
    group api(cloud)[API Layer]

    service gateway(internet)[API Gateway] in api
    service auth(server)[Auth Service] in api
    service users(database)[User DB] in api

    gateway:R --> L:auth
    auth:R --> L:users`,
  },
  {
    id: 'kanban',
    name: 'Kanban',
    description: 'Kanban boards with columns and cards',
    icon: '📋',
    code: `kanban
  Todo
    Design homepage
    Write tests
  In Progress
    Build API
  Done
    Setup CI/CD`,
  },
  {
    id: 'sankey',
    name: 'Sankey',
    description: 'Flow diagrams showing quantities',
    icon: '🌊',
    code: `sankey-beta
Solar,Grid,45
Solar,Battery,20
Wind,Grid,30
Grid,Homes,55
Grid,Industry,20
Battery,Homes,18`,
  },
  {
    id: 'block',
    name: 'Block',
    description: 'Block diagrams with columns and sections',
    icon: '🧱',
    code: `block-beta
  columns 3
  Frontend:3
  a["React App"]:1
  b["Admin Panel"]:1
  c["Mobile App"]:1
  space:3
  Backend:3
  d["API Server"]:2
  e["Workers"]:1`,
  },
  {
    id: 'packet',
    name: 'Packet',
    description: 'Network packet structure diagrams',
    icon: '📦',
    code: `packet-beta
  0-15: "Source Port"
  16-31: "Destination Port"
  32-63: "Sequence Number"
  64-95: "Acknowledgment Number"
  96-99: "Data Offset"
  100-105: "Reserved"
  106-111: "Flags"
  112-127: "Window Size"`,
  },
  {
    id: 'journey',
    name: 'User Journey',
    description: 'Map user experiences across touchpoints',
    icon: '🚶',
    code: `journey
  title Customer Onboarding
  section Discovery
    Visit website: 5: Customer
    Read docs: 3: Customer
  section Signup
    Create account: 5: Customer
    Verify email: 3: Customer, System
  section First Use
    Complete tutorial: 4: Customer
    Create first project: 5: Customer`,
  },
  {
    id: 'requirement',
    name: 'Requirement',
    description: 'Requirements and their relationships',
    icon: '📝',
    code: `requirementDiagram

  requirement Login {
    id: 1
    text: Users must be able to log in
    risk: low
    verifymethod: test
  }

  element web_app {
    type: application
  }

  web_app - satisfies -> Login`,
  },
  {
    id: 'radar',
    name: 'Radar',
    description: 'Radar/spider charts for comparison',
    icon: '🎯',
    code: `radar-beta
  axis speed, reliability, cost, features, support
  curve teamA {4, 3, 2, 5, 4}
  curve teamB {2, 5, 4, 3, 5}`,
  },
]
