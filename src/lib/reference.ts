// Reference documentation for each Mermaid diagram type
// Exhaustive coverage of Mermaid v11 syntax elements
// Each element includes complete working examples

export interface RefElement {
  name: string          // keyword / syntax token
  syntax: string        // short syntax signature
  description: string  // one-line description
  examples: {
    label: string       // 2-4 word label
    code: string        // minimal complete snippet showing this element
  }[]
}

export interface DiagramRef {
  id: string
  label: string
  elements: RefElement[]
}

export const DIAGRAM_REFS: Record<string, DiagramRef> = {
  flowchart: {
    id: 'flowchart',
    label: 'Flowchart',
    elements: [
      {
        name: 'graph / flowchart',
        syntax: 'flowchart TD|LR|BT|RL|TB',
        description: 'Declare a flowchart with direction: TD (top-down), LR (left-right), BT (bottom-top), RL (right-left), TB (top-bottom)',
        examples: [
          { label: 'TD direction', code: 'flowchart TD\n  A[Start] --> B[Process] --> C[End]' },
          { label: 'LR direction', code: 'flowchart LR\n  X[Input] --> Y[Transform] --> Z[Output]' },
        ],
      },
      {
        name: 'rectangle node',
        syntax: 'nodeId[Text]',
        description: 'Create a rectangular node with text inside',
        examples: [
          { label: 'Rectangle', code: 'flowchart TD\n  A[This is a rectangle]\n  B[Another box]' },
        ],
      },
      {
        name: 'rounded node',
        syntax: 'nodeId(Text)',
        description: 'Create a rounded rectangle node',
        examples: [
          { label: 'Rounded box', code: 'flowchart TD\n  A(Rounded corners)\n  B(Another rounded)' },
        ],
      },
      {
        name: 'stadium node',
        syntax: 'nodeId([Text])',
        description: 'Create an oval/stadium-shaped node',
        examples: [
          { label: 'Stadium shape', code: 'flowchart TD\n  A([Start/End point])\n  B([Process])\n  A --> B' },
        ],
      },
      {
        name: 'subroutine node',
        syntax: 'nodeId[[Text]]',
        description: 'Create a subroutine rectangle with double brackets',
        examples: [
          { label: 'Subroutine', code: 'flowchart TD\n  A[[Database query]]\n  B[[API call]]\n  A --> B' },
        ],
      },
      {
        name: 'cylinder node',
        syntax: 'nodeId[(Text)]',
        description: 'Create a cylinder shape for databases',
        examples: [
          { label: 'Database', code: 'flowchart TD\n  A[(User DB)]\n  B[(Product DB)]\n  C[API] --> A\n  C --> B' },
        ],
      },
      {
        name: 'circle node',
        syntax: 'nodeId((Text))',
        description: 'Create a perfect circle node',
        examples: [
          { label: 'Circle', code: 'flowchart TD\n  A((Node A))\n  B((Node B))\n  A --> B' },
        ],
      },
      {
        name: 'asymmetric node',
        syntax: 'nodeId>Text]',
        description: 'Create an asymmetric arrow-like node pointing right',
        examples: [
          { label: 'Asymmetric', code: 'flowchart TD\n  A>Important]\n  B[Normal]\n  A --> B' },
        ],
      },
      {
        name: 'rhombus node',
        syntax: 'nodeId{Text}',
        description: 'Create a diamond/rhombus node for decisions',
        examples: [
          { label: 'Decision', code: 'flowchart TD\n  A{Valid?}\n  A -->|Yes| B[Proceed]\n  A -->|No| C[Reject]' },
        ],
      },
      {
        name: 'hexagon node',
        syntax: 'nodeId{{Text}}',
        description: 'Create a hexagon-shaped node',
        examples: [
          { label: 'Hexagon', code: 'flowchart TD\n  A{{Process}}\n  B[Step]\n  A --> B' },
        ],
      },
      {
        name: 'parallelogram node',
        syntax: 'nodeId[/Text/]',
        description: 'Create a parallelogram node with forward slash style',
        examples: [
          { label: 'Parallelogram', code: 'flowchart TD\n  A[/Input data/]\n  B[Process]\n  A --> B' },
        ],
      },
      {
        name: 'parallelogram alt node',
        syntax: 'nodeId[\\\\Text\\\\]',
        description: 'Create a parallelogram node with backslash style',
        examples: [
          { label: 'Alt parallelogram', code: 'flowchart TD\n  A[\\Output\\]\n  B[Result]\n  B --> A' },
        ],
      },
      {
        name: 'trapezoid node',
        syntax: 'nodeId[/Text\\\\]',
        description: 'Create a trapezoid node wider at bottom',
        examples: [
          { label: 'Trapezoid', code: 'flowchart TD\n  A[/Wide bottom\\]\n  B[Normal]\n  A --> B' },
        ],
      },
      {
        name: 'trapezoid alt node',
        syntax: 'nodeId[\\\\Text/]',
        description: 'Create a trapezoid node wider at top',
        examples: [
          { label: 'Alt trapezoid', code: 'flowchart TD\n  A[\\Wide top/]\n  B[Normal]\n  A --> B' },
        ],
      },
      {
        name: 'double circle node',
        syntax: 'nodeId(((Text)))',
        description: 'Create a node with double circle border',
        examples: [
          { label: 'Double circle', code: 'flowchart TD\n  A(((Critical)))\n  B((Normal))\n  A --> B' },
        ],
      },
      {
        name: 'solid arrow edge',
        syntax: 'A --> B',
        description: 'Draw a solid arrow from node A to node B',
        examples: [
          { label: 'Solid arrow', code: 'flowchart TD\n  A[Start] --> B[End]' },
        ],
      },
      {
        name: 'open line edge',
        syntax: 'A --- B',
        description: 'Draw an open line without arrowhead between nodes',
        examples: [
          { label: 'Open line', code: 'flowchart TD\n  A[First] --- B[Second]' },
        ],
      },
      {
        name: 'dotted arrow edge',
        syntax: 'A -.-> B',
        description: 'Draw a dotted arrow between nodes',
        examples: [
          { label: 'Dotted arrow', code: 'flowchart TD\n  A[Plan] -.-> B[Maybe do]' },
        ],
      },
      {
        name: 'thick arrow edge',
        syntax: 'A ==> B',
        description: 'Draw a thick/bold arrow between nodes',
        examples: [
          { label: 'Thick arrow', code: 'flowchart TD\n  A[Critical] ==> B[Must do]' },
        ],
      },
      {
        name: 'circle arrow edge',
        syntax: 'A --o B',
        description: 'Draw an arrow with circle on target end',
        examples: [
          { label: 'Circle arrowhead', code: 'flowchart TD\n  A[Source] --o B[Target]' },
        ],
      },
      {
        name: 'cross arrow edge',
        syntax: 'A --x B',
        description: 'Draw an arrow with cross on target end',
        examples: [
          { label: 'Cross arrowhead', code: 'flowchart TD\n  A[Source] --x B[Target]' },
        ],
      },
      {
        name: 'bidirectional arrow',
        syntax: 'A <--> B',
        description: 'Draw arrows pointing both directions',
        examples: [
          { label: 'Bidirectional', code: 'flowchart TD\n  A[Node A] <--> B[Node B]' },
        ],
      },
      {
        name: 'circle to circle edge',
        syntax: 'A o--o B',
        description: 'Draw a line with circles on both ends',
        examples: [
          { label: 'Circle both ends', code: 'flowchart TD\n  A[A] o--o B[B]' },
        ],
      },
      {
        name: 'cross to cross edge',
        syntax: 'A x--x B',
        description: 'Draw a line with crosses on both ends',
        examples: [
          { label: 'Cross both ends', code: 'flowchart TD\n  A[A] x--x B[B]' },
        ],
      },
      {
        name: 'edge label',
        syntax: 'A -->|Text| B or A -- Text --> B',
        description: 'Add a label on an edge between nodes',
        examples: [
          { label: 'Labeled edge', code: 'flowchart TD\n  A{Condition?} -->|Yes| B[Proceed]\n  A -->|No| C[Cancel]' },
          { label: 'Alt label syntax', code: 'flowchart TD\n  X -- Success --> Y\n  X -- Failure --> Z' },
        ],
      },
      {
        name: 'multi-line edge',
        syntax: 'A --> B\nB --> C\nB --> D',
        description: 'Chain multiple edges from one or more nodes',
        examples: [
          { label: 'Multi-edge', code: 'flowchart TD\n  A --> B --> C\n  A --> D' },
        ],
      },
      {
        name: 'subgraph',
        syntax: 'subgraph id[Title]\n  nodes\nend',
        description: 'Group nodes into a subgraph with optional title and direction',
        examples: [
          { label: 'Subgraph basic', code: 'flowchart TD\n  subgraph A[Frontend]\n    X[React]\n    Y[Redux]\n  end\n  subgraph B[Backend]\n    Z[Node.js]\n  end\n  Y --> Z' },
          { label: 'Nested subgraph', code: 'flowchart TD\n  subgraph A[Outer]\n    subgraph B[Inner]\n      X[Node]\n    end\n  end' },
        ],
      },
      {
        name: 'subgraph direction',
        syntax: 'subgraph LR id[Title]\n  nodes\nend',
        description: 'Set explicit direction within a subgraph',
        examples: [
          { label: 'Subgraph LR', code: 'flowchart TD\n  subgraph LR inner[Horizontal]\n    A[Left] --> B[Right]\n  end' },
        ],
      },
      {
        name: 'classDef',
        syntax: 'classDef className fill:#color,stroke:#color',
        description: 'Define a reusable style class for multiple nodes',
        examples: [
          { label: 'Class definition', code: 'flowchart TD\n  A[Process]\n  B[Data]\n  classDef procStyle fill:#f9f,stroke:#333,stroke-width:2px\n  class A procStyle' },
        ],
      },
      {
        name: 'class assignment',
        syntax: 'class nodeId className or class A,B,C className',
        description: 'Assign one or more nodes to a style class',
        examples: [
          { label: 'Assign class', code: 'flowchart TD\n  A[Node1]\n  B[Node2]\n  C[Node3]\n  classDef highlight fill:#ff9\n  class A,C highlight' },
        ],
      },
      {
        name: 'linkStyle',
        syntax: 'linkStyle index fill:#color,stroke:#color',
        description: 'Style a specific edge by its zero-based index',
        examples: [
          { label: 'Style edge', code: 'flowchart TD\n  A --> B --> C\n  D --> E\n  linkStyle 0,2 stroke:#f00,stroke-width:2px' },
        ],
      },
      {
        name: 'style node',
        syntax: 'style nodeId fill:#color,stroke:#color,color:#textcolor',
        description: 'Apply inline style to a specific node',
        examples: [
          { label: 'Inline style', code: 'flowchart TD\n  A[Important]\n  B[Normal]\n  style A fill:#f99,stroke:#900,stroke-width:3px' },
        ],
      },
      {
        name: 'click interaction',
        syntax: 'click nodeId "url" "tooltip"',
        description: 'Make a node clickable with URL and tooltip',
        examples: [
          { label: 'Clickable node', code: 'flowchart TD\n  A[Google]\n  click A "https://google.com" "Go to Google"' },
        ],
      },
      {
        name: 'comment',
        syntax: '%% Comment text',
        description: 'Add a comment line that is ignored by parser',
        examples: [
          { label: 'Comments', code: 'flowchart TD\n  %% This is a comment\n  A[Start]\n  %% Another comment\n  A --> B[End]' },
        ],
      },
    ],
  },

  sequenceDiagram: {
    id: 'sequenceDiagram',
    label: 'Sequence',
    elements: [
      {
        name: 'participant',
        syntax: 'participant Alias as Label',
        description: 'Declare a participant in the sequence with optional alias',
        examples: [
          { label: 'Named actors', code: 'sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C ->> S: Request\n  S -->> C: Response' },
        ],
      },
      {
        name: 'actor',
        syntax: 'actor Name',
        description: 'Declare a human actor with person icon',
        examples: [
          { label: 'Human actor', code: 'sequenceDiagram\n  actor User\n  participant App\n  User ->> App: Click button\n  App -->> User: Show result' },
        ],
      },
      {
        name: 'solid arrow message',
        syntax: 'A ->> B: Message',
        description: 'Send a synchronous message with solid arrowhead',
        examples: [
          { label: 'Solid arrow', code: 'sequenceDiagram\n  participant A\n  participant B\n  A ->> B: Synchronous call' },
        ],
      },
      {
        name: 'solid dashed message',
        syntax: 'A -->> B: Message',
        description: 'Send an asynchronous message with dashed solid arrow',
        examples: [
          { label: 'Dashed solid', code: 'sequenceDiagram\n  participant A\n  participant B\n  A -->> B: Async response' },
        ],
      },
      {
        name: 'open arrow message',
        syntax: 'A -> B: Message',
        description: 'Send a message with open arrowhead (no fill)',
        examples: [
          { label: 'Open arrow', code: 'sequenceDiagram\n  A -> B: Message with open head' },
        ],
      },
      {
        name: 'open dashed message',
        syntax: 'A --> B: Message',
        description: 'Send a dashed message with open arrowhead',
        examples: [
          { label: 'Open dashed', code: 'sequenceDiagram\n  A --> B: Dashed open message' },
        ],
      },
      {
        name: 'cross message',
        syntax: 'A ->x B: Message',
        description: 'Send a message with cross/X mark on target',
        examples: [
          { label: 'Cross arrow', code: 'sequenceDiagram\n  A ->x B: Lost message' },
        ],
      },
      {
        name: 'cross dashed message',
        syntax: 'A --x B: Message',
        description: 'Send a dashed message with cross on target',
        examples: [
          { label: 'Cross dashed', code: 'sequenceDiagram\n  A --x B: Failed async' },
        ],
      },
      {
        name: 'open circle message',
        syntax: 'A ->)B: Message',
        description: 'Send a message with open circle on target',
        examples: [
          { label: 'Open circle', code: 'sequenceDiagram\n  A ->)B: Message to open circle' },
        ],
      },
      {
        name: 'bidirectional message',
        syntax: 'A <<->> B: Message',
        description: 'Send arrows in both directions simultaneously',
        examples: [
          { label: 'Bidirectional', code: 'sequenceDiagram\n  A <<->> B: Bidirectional exchange' },
        ],
      },
      {
        name: 'activate',
        syntax: 'activate Participant',
        description: 'Start showing an activation box on a participant lifeline',
        examples: [
          { label: 'Activation', code: 'sequenceDiagram\n  A ->> B: Request\n  activate B\n  B ->> C: Forward\n  deactivate B' },
        ],
      },
      {
        name: 'deactivate',
        syntax: 'deactivate Participant',
        description: 'Stop showing the activation box for a participant',
        examples: [
          { label: 'Deactivation', code: 'sequenceDiagram\n  A ->> B: Call\n  activate B\n  B -->> A: Done\n  deactivate B' },
        ],
      },
      {
        name: 'autonumber',
        syntax: 'autonumber',
        description: 'Add automatic sequential numbers to all messages',
        examples: [
          { label: 'Auto-numbered', code: 'sequenceDiagram\n  autonumber\n  A ->> B: First\n  B -->> A: Second\n  A ->> C: Third' },
        ],
      },
      {
        name: 'autonumber restart',
        syntax: 'autonumber start-value',
        description: 'Restart autonumbering from a specific value',
        examples: [
          { label: 'Restart number', code: 'sequenceDiagram\n  autonumber\n  A ->> B: 1\n  autonumber 10\n  A ->> B: 10' },
        ],
      },
      {
        name: 'loop',
        syntax: 'loop Condition\n  ...\nend',
        description: 'Mark a sequence of messages as repeating in a loop box',
        examples: [
          { label: 'Loop block', code: 'sequenceDiagram\n  A ->> B: Start\n  loop Retry\n    B ->> C: Attempt\n    C -->> B: Wait\n  end' },
        ],
      },
      {
        name: 'alt / else',
        syntax: 'alt Condition1\n  ...\nelse Condition2\n  ...\nend',
        description: 'Mark alternative conditional branches (if/else)',
        examples: [
          { label: 'Alt/else', code: 'sequenceDiagram\n  A ->> B: Check\n  alt Success\n    B -->> A: OK\n  else Failure\n    B -->> A: Error\n  end' },
        ],
      },
      {
        name: 'opt',
        syntax: 'opt Condition\n  ...\nend',
        description: 'Mark an optional block that may or may not execute',
        examples: [
          { label: 'Optional block', code: 'sequenceDiagram\n  A ->> B: Optional\n  opt Only if needed\n    B ->> C: Do something\n  end' },
        ],
      },
      {
        name: 'par / and',
        syntax: 'par Task1\n  ...\nand Task2\n  ...\nend',
        description: 'Mark parallel execution of multiple tasks',
        examples: [
          { label: 'Parallel', code: 'sequenceDiagram\n  par Fetch data\n    A ->> B: Get users\n  and Load config\n    A ->> C: Get settings\n  end' },
        ],
      },
      {
        name: 'critical / option',
        syntax: 'critical Requirement\n  ...\noption Fallback\n  ...\nend',
        description: 'Mark critical section with optional fallback',
        examples: [
          { label: 'Critical', code: 'sequenceDiagram\n  A ->> B: Critical operation\n  critical Must succeed\n    B ->> C: Important\n  option Fallback\n    B ->> D: Alternative\n  end' },
        ],
      },
      {
        name: 'break',
        syntax: 'break Condition\n  ...\nend',
        description: 'Mark a break point that exits the sequence',
        examples: [
          { label: 'Break', code: 'sequenceDiagram\n  loop Check\n    A ->> B: Try\n    break On error\n      B -->> A: Failed\n    end\n  end' },
        ],
      },
      {
        name: 'rect highlight',
        syntax: 'rect rgb(200, 150, 255)\n  ...\nend',
        description: 'Highlight a region with a colored rectangle',
        examples: [
          { label: 'Highlight', code: 'sequenceDiagram\n  A ->> B: Before\n  rect rgb(200, 150, 255)\n    A ->> B: Important section\n  end\n  B -->> A: After' },
        ],
      },
      {
        name: 'note left',
        syntax: 'Note left of Participant: Text',
        description: 'Add a note on the left side of a participant',
        examples: [
          { label: 'Left note', code: 'sequenceDiagram\n  A ->> B: Message\n  Note left of A: Comment here' },
        ],
      },
      {
        name: 'note right',
        syntax: 'Note right of Participant: Text',
        description: 'Add a note on the right side of a participant',
        examples: [
          { label: 'Right note', code: 'sequenceDiagram\n  A ->> B: Message\n  Note right of B: Response note' },
        ],
      },
      {
        name: 'note over',
        syntax: 'Note over Participant1,Participant2: Text',
        description: 'Add a note spanning over one or more participants',
        examples: [
          { label: 'Over note', code: 'sequenceDiagram\n  A ->> B: First\n  Note over A,B: Both involved\n  B -->> A: Response' },
        ],
      },
      {
        name: 'title',
        syntax: 'title Diagram Title',
        description: 'Set a title for the sequence diagram',
        examples: [
          { label: 'With title', code: 'sequenceDiagram\n  title User Login Flow\n  User ->> App: Login request\n  App -->> User: Session token' },
        ],
      },
      {
        name: 'create',
        syntax: 'create Participant',
        description: 'Create a new participant during sequence',
        examples: [
          { label: 'Create', code: 'sequenceDiagram\n  A ->> B: Create new\n  create participant C\n  B ->> C: Initialize' },
        ],
      },
      {
        name: 'destroy',
        syntax: 'destroy Participant',
        description: 'Destroy/remove a participant from sequence',
        examples: [
          { label: 'Destroy', code: 'sequenceDiagram\n  A ->> B: End session\n  destroy B\n  Note left of A: B is gone' },
        ],
      },
      {
        name: 'box grouping',
        syntax: 'box rgb(200, 150, 255)\n  participant A\n  participant B\nend',
        description: 'Group participants in a colored box',
        examples: [
          { label: 'Box group', code: 'sequenceDiagram\n  box rgb(200, 150, 255)\n    participant Frontend\n    participant Cache\n  end\n  box rgb(150, 200, 255)\n    participant Backend\n  end\n  Frontend ->> Cache: Query' },
        ],
      },
    ],
  },

  classDiagram: {
    id: 'classDiagram',
    label: 'Class',
    elements: [
      {
        name: 'class',
        syntax: 'class ClassName {members}',
        description: 'Declare a class with optional attributes and methods',
        examples: [
          { label: 'Simple class', code: 'classDiagram\n  class Animal {\n    +String name\n    +int age\n    +makeSound() void\n  }' },
        ],
      },
      {
        name: 'interface',
        syntax: 'class ClassName {\n  <<interface>>\n}',
        description: 'Declare an interface (implemented using stereotype)',
        examples: [
          { label: 'Interface', code: 'classDiagram\n  class Drawable {\n    <<interface>>\n    +draw() void\n  }' },
        ],
      },
      {
        name: 'abstract class',
        syntax: 'class ClassName {\n  <<abstract>>\n}',
        description: 'Declare an abstract class using stereotype',
        examples: [
          { label: 'Abstract', code: 'classDiagram\n  class Shape {\n    <<abstract>>\n    +area() float\n  }' },
        ],
      },
      {
        name: 'enum',
        syntax: 'class EnumName {\n  <<enumeration>>\n}',
        description: 'Declare an enumeration class',
        examples: [
          { label: 'Enum', code: 'classDiagram\n  class Status {\n    <<enumeration>>\n    PENDING\n    APPROVED\n    REJECTED\n  }' },
        ],
      },
      {
        name: 'public visibility',
        syntax: '+memberName: Type',
        description: 'Public member with plus prefix',
        examples: [
          { label: 'Public', code: 'classDiagram\n  class Example {\n    +name: String\n    +getValue(): int\n  }' },
        ],
      },
      {
        name: 'private visibility',
        syntax: '-memberName: Type',
        description: 'Private member with minus prefix',
        examples: [
          { label: 'Private', code: 'classDiagram\n  class Account {\n    -balance: float\n    -calculateInterest(): void\n  }' },
        ],
      },
      {
        name: 'protected visibility',
        syntax: '#memberName: Type',
        description: 'Protected member with hash prefix',
        examples: [
          { label: 'Protected', code: 'classDiagram\n  class Base {\n    #data: String\n    #process(): void\n  }' },
        ],
      },
      {
        name: 'package visibility',
        syntax: '~memberName: Type',
        description: 'Package-private member with tilde prefix',
        examples: [
          { label: 'Package', code: 'classDiagram\n  class Internal {\n    ~cache: Map\n    ~refresh(): void\n  }' },
        ],
      },
      {
        name: 'static member',
        syntax: '$memberName: Type',
        description: 'Static/class member with dollar prefix',
        examples: [
          { label: 'Static', code: 'classDiagram\n  class Counter {\n    -$nextId: int\n    +$getInstance(): Counter\n  }' },
        ],
      },
      {
        name: 'inheritance',
        syntax: 'Child <|-- Parent',
        description: 'Inheritance relationship (is-a)',
        examples: [
          { label: 'Inheritance', code: 'classDiagram\n  class Animal\n  class Dog\n  Dog <|-- Animal' },
        ],
      },
      {
        name: 'composition',
        syntax: 'Whole *-- Part',
        description: 'Composition relationship (owns)',
        examples: [
          { label: 'Composition', code: 'classDiagram\n  class Car\n  class Engine\n  Car *-- Engine' },
        ],
      },
      {
        name: 'aggregation',
        syntax: 'Container o-- Item',
        description: 'Aggregation relationship (has-a, can exist independently)',
        examples: [
          { label: 'Aggregation', code: 'classDiagram\n  class Company\n  class Employee\n  Company o-- Employee' },
        ],
      },
      {
        name: 'association',
        syntax: 'Class1 --> Class2',
        description: 'Association relationship (uses)',
        examples: [
          { label: 'Association', code: 'classDiagram\n  class Driver\n  class Car\n  Driver --> Car' },
        ],
      },
      {
        name: 'dependency',
        syntax: 'Class1 ..> Class2',
        description: 'Dependency relationship (uses temporarily)',
        examples: [
          { label: 'Dependency', code: 'classDiagram\n  class Client\n  class Service\n  Client ..> Service' },
        ],
      },
      {
        name: 'realization',
        syntax: 'Class ..|> Interface',
        description: 'Realization relationship (implements interface)',
        examples: [
          { label: 'Realization', code: 'classDiagram\n  class Circle\n  class Shape\n  Circle ..|> Shape' },
        ],
      },
      {
        name: 'multiplicity',
        syntax: 'A "1" --> "0..1" B',
        description: 'Add cardinality/multiplicity labels to relationships',
        examples: [
          { label: 'Multiplicity', code: 'classDiagram\n  class Order\n  class Item\n  Order "1" --> "0..*" Item : contains' },
        ],
      },
      {
        name: 'relationship label',
        syntax: 'A --> B : label',
        description: 'Add descriptive label to relationship',
        examples: [
          { label: 'Labeled relation', code: 'classDiagram\n  class User\n  class Account\n  User --> Account : manages' },
        ],
      },
      {
        name: 'generic class',
        syntax: 'class Name~Type~',
        description: 'Generic/template class with type parameter',
        examples: [
          { label: 'Generic', code: 'classDiagram\n  class List~T~ {\n    +add(item: T)\n    +get(index: int) T\n  }' },
        ],
      },
      {
        name: 'namespace',
        syntax: 'namespace Name {\n  class ...\n}',
        description: 'Group classes into a namespace container',
        examples: [
          { label: 'Namespace', code: 'classDiagram\n  namespace Models {\n    class User\n    class Product\n  }\n  namespace Services {\n    class UserService\n  }' },
        ],
      },
      {
        name: 'annotation',
        syntax: 'class Name {\n  <<annotation>>\n}',
        description: 'Mark class as annotation using stereotype',
        examples: [
          { label: 'Annotation', code: 'classDiagram\n  class Override {\n    <<annotation>>\n  }' },
        ],
      },
      {
        name: 'note',
        syntax: 'Note right of ClassName : text',
        description: 'Attach a note comment to a class',
        examples: [
          { label: 'Note', code: 'classDiagram\n  class User\n  Note right of User : Main user class' },
        ],
      },
      {
        name: 'click',
        syntax: 'click ClassName "url" "tooltip"',
        description: 'Make a class clickable with URL',
        examples: [
          { label: 'Clickable', code: 'classDiagram\n  class Example\n  click Example "https://example.com"' },
        ],
      },
    ],
  },

  stateDiagram: {
    id: 'stateDiagram',
    label: 'State',
    elements: [
      {
        name: 'stateDiagram-v2 declaration',
        syntax: 'stateDiagram-v2',
        description: 'Declare a state diagram (v2 is the recommended version)',
        examples: [
          { label: 'Basic', code: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running\n  Running --> [*]' },
        ],
      },
      {
        name: 'simple state',
        syntax: 'StateName',
        description: 'Declare a simple named state',
        examples: [
          { label: 'Simple state', code: 'stateDiagram-v2\n  Active\n  Inactive' },
        ],
      },
      {
        name: 'state with label',
        syntax: 'state "Display Label" as stateId',
        description: 'State with custom display label different from ID',
        examples: [
          { label: 'Labeled state', code: 'stateDiagram-v2\n  state "Waiting for input" as wait\n  [*] --> wait' },
        ],
      },
      {
        name: 'start state',
        syntax: '[*]',
        description: 'Initial state marker',
        examples: [
          { label: 'Start', code: 'stateDiagram-v2\n  [*] --> FirstState' },
        ],
      },
      {
        name: 'end state',
        syntax: '[*]',
        description: 'Final/exit state marker',
        examples: [
          { label: 'End', code: 'stateDiagram-v2\n  FinalState --> [*]' },
        ],
      },
      {
        name: 'transition',
        syntax: 'StateA --> StateB',
        description: 'Transition from one state to another',
        examples: [
          { label: 'Simple transition', code: 'stateDiagram-v2\n  A --> B\n  B --> C' },
        ],
      },
      {
        name: 'transition with event',
        syntax: 'StateA --> StateB : event',
        description: 'Transition with event/trigger label',
        examples: [
          { label: 'Event label', code: 'stateDiagram-v2\n  Idle --> Running : start\n  Running --> Idle : stop' },
        ],
      },
      {
        name: 'composite state',
        syntax: 'state Name {\n  ...\n}',
        description: 'Nested states inside a composite state',
        examples: [
          { label: 'Composite', code: 'stateDiagram-v2\n  state Processing {\n    Validate --> Process\n    Process --> Store\n  }\n  [*] --> Processing --> [*]' },
        ],
      },
      {
        name: 'fork',
        syntax: 'state fork <<fork>>',
        description: 'Parallel fork point for concurrent execution',
        examples: [
          { label: 'Fork', code: 'stateDiagram-v2\n  state fork <<fork>>\n  [*] --> fork\n  fork --> Branch1\n  fork --> Branch2' },
        ],
      },
      {
        name: 'join',
        syntax: 'state join <<join>>',
        description: 'Synchronization point joining parallel branches',
        examples: [
          { label: 'Join', code: 'stateDiagram-v2\n  state join <<join>>\n  Branch1 --> join\n  Branch2 --> join\n  join --> [*]' },
        ],
      },
      {
        name: 'choice',
        syntax: 'state choice <<choice>>',
        description: 'Decision point for conditional transitions',
        examples: [
          { label: 'Choice', code: 'stateDiagram-v2\n  state choice <<choice>>\n  A --> choice\n  choice --> B : condition1\n  choice --> C : condition2' },
        ],
      },
      {
        name: 'direction',
        syntax: 'direction LR|TB',
        description: 'Set diagram direction (LR=left-right, TB=top-bottom)',
        examples: [
          { label: 'Horizontal', code: 'stateDiagram-v2\n  direction LR\n  A --> B --> C' },
        ],
      },
      {
        name: 'note left of state',
        syntax: 'note left of StateName\n  text\nend note',
        description: 'Add note on the left side of a state',
        examples: [
          { label: 'Left note', code: 'stateDiagram-v2\n  State1\n  note left of State1\n    This is on the left\n  end note' },
        ],
      },
      {
        name: 'note right of state',
        syntax: 'note right of StateName\n  text\nend note',
        description: 'Add note on the right side of a state',
        examples: [
          { label: 'Right note', code: 'stateDiagram-v2\n  State1\n  note right of State1\n    This is on the right\n  end note' },
        ],
      },
      {
        name: 'hide empty description',
        syntax: 'hide empty description',
        description: 'Hide the description area for states without text',
        examples: [
          { label: 'Hide empty', code: 'stateDiagram-v2\n  hide empty description\n  A --> B\n  B --> C' },
        ],
      },
      {
        name: 'state with type',
        syntax: 'state Name <<type>>',
        description: 'Add stereotype/type to a state',
        examples: [
          { label: 'State type', code: 'stateDiagram-v2\n  state Active <<important>>\n  [*] --> Active' },
        ],
      },
    ],
  },

  erDiagram: {
    id: 'erDiagram',
    label: 'ER Diagram',
    elements: [
      {
        name: 'entity declaration',
        syntax: 'ENTITY_NAME {}',
        description: 'Declare an entity with optional attributes block',
        examples: [
          { label: 'Entity', code: 'erDiagram\n  CUSTOMER {\n    int id PK\n    string name\n    string email\n  }' },
        ],
      },
      {
        name: 'string attribute',
        syntax: 'string attributeName',
        description: 'String type attribute',
        examples: [
          { label: 'String', code: 'erDiagram\n  USER {\n    string username\n    string email\n  }' },
        ],
      },
      {
        name: 'int attribute',
        syntax: 'int attributeName',
        description: 'Integer type attribute',
        examples: [
          { label: 'Int', code: 'erDiagram\n  PRODUCT {\n    int id PK\n    int quantity\n  }' },
        ],
      },
      {
        name: 'float attribute',
        syntax: 'float attributeName',
        description: 'Float/decimal type attribute',
        examples: [
          { label: 'Float', code: 'erDiagram\n  ORDER {\n    float totalAmount\n    float taxRate\n  }' },
        ],
      },
      {
        name: 'boolean attribute',
        syntax: 'boolean attributeName',
        description: 'Boolean type attribute',
        examples: [
          { label: 'Boolean', code: 'erDiagram\n  FEATURE {\n    boolean isActive\n    boolean isDeleted\n  }' },
        ],
      },
      {
        name: 'date attribute',
        syntax: 'date attributeName',
        description: 'Date type attribute (YYYY-MM-DD)',
        examples: [
          { label: 'Date', code: 'erDiagram\n  EVENT {\n    date startDate\n    date endDate\n  }' },
        ],
      },
      {
        name: 'datetime attribute',
        syntax: 'datetime attributeName',
        description: 'Datetime type attribute (YYYY-MM-DD HH:MM:SS)',
        examples: [
          { label: 'Datetime', code: 'erDiagram\n  LOG {\n    datetime createdAt\n    datetime updatedAt\n  }' },
        ],
      },
      {
        name: 'timestamp attribute',
        syntax: 'timestamp attributeName',
        description: 'Timestamp type attribute (Unix timestamp)',
        examples: [
          { label: 'Timestamp', code: 'erDiagram\n  SESSION {\n    timestamp lastAccess\n  }' },
        ],
      },
      {
        name: 'primary key',
        syntax: 'type name PK',
        description: 'Mark attribute as primary key',
        examples: [
          { label: 'PK', code: 'erDiagram\n  CUSTOMER {\n    int id PK\n    string name\n  }' },
        ],
      },
      {
        name: 'foreign key',
        syntax: 'type name FK',
        description: 'Mark attribute as foreign key',
        examples: [
          { label: 'FK', code: 'erDiagram\n  ORDER {\n    int id PK\n    int customerId FK\n  }' },
        ],
      },
      {
        name: 'unique key',
        syntax: 'type name UK',
        description: 'Mark attribute as unique constraint',
        examples: [
          { label: 'UK', code: 'erDiagram\n  USER {\n    int id PK\n    string email UK\n  }' },
        ],
      },
      {
        name: 'attribute comment',
        syntax: 'type name "comment"',
        description: 'Add description comment to attribute',
        examples: [
          { label: 'Comment', code: 'erDiagram\n  ORDER {\n    int id PK\n    float total "in USD"\n    string status "pending, processing, done"\n  }' },
        ],
      },
      {
        name: 'exactly one cardinality',
        syntax: '||',
        description: 'One-to-one relationship marker (exactly one)',
        examples: [
          { label: 'One-to-one', code: 'erDiagram\n  USER ||--|| PROFILE : has' },
        ],
      },
      {
        name: 'zero or one cardinality',
        syntax: '|o',
        description: 'Zero-to-one relationship marker',
        examples: [
          { label: 'Zero-to-one', code: 'erDiagram\n  USER |o--|| AVATAR : may_have' },
        ],
      },
      {
        name: 'zero or many cardinality',
        syntax: '}o',
        description: 'Zero-to-many relationship marker',
        examples: [
          { label: 'Zero-to-many', code: 'erDiagram\n  USER }o--|| SETTINGS : has' },
        ],
      },
      {
        name: 'one or many cardinality',
        syntax: '}|',
        description: 'One-to-many relationship marker',
        examples: [
          { label: 'One-to-many', code: 'erDiagram\n  CUSTOMER }|--|| ORDER : places' },
        ],
      },
      {
        name: 'solid line relationship',
        syntax: '--',
        description: 'Solid line connecting entities',
        examples: [
          { label: 'Solid line', code: 'erDiagram\n  A ||--|| B : relates' },
        ],
      },
      {
        name: 'dashed line relationship',
        syntax: '..',
        description: 'Dashed line connecting entities',
        examples: [
          { label: 'Dashed line', code: 'erDiagram\n  A ||..|| B : optional_relates' },
        ],
      },
      {
        name: 'relationship label',
        syntax: 'A ||--|| B : "label"',
        description: 'Add descriptive label to relationship',
        examples: [
          { label: 'Labeled', code: 'erDiagram\n  CUSTOMER ||--o{ ORDER : "places orders"\n  ORDER ||--|{ ITEM : "contains items"' },
        ],
      },
    ],
  },

  gantt: {
    id: 'gantt',
    label: 'Gantt',
    elements: [
      {
        name: 'title',
        syntax: 'title Project Name',
        description: 'Set the chart title displayed at the top',
        examples: [
          { label: 'Title', code: 'gantt\n  title Project Timeline\n  dateFormat YYYY-MM-DD\n  section Phase1\n    Task : 2024-01-01, 10d' },
        ],
      },
      {
        name: 'dateFormat',
        syntax: 'dateFormat YYYY-MM-DD|YYYY/MM/DD|etc',
        description: 'Set the date format pattern for parsing task dates',
        examples: [
          { label: 'Date format', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Work\n    TaskA : 2024-02-01, 5d' },
        ],
      },
      {
        name: 'axisFormat',
        syntax: 'axisFormat %Y-%m-%d',
        description: 'Set the format for displaying dates on the axis',
        examples: [
          { label: 'Axis format', code: 'gantt\n  dateFormat YYYY-MM-DD\n  axisFormat %Y-%m-%d\n  section Work\n    Task : 2024-01-01, 7d' },
        ],
      },
      {
        name: 'tickInterval',
        syntax: 'tickInterval 1week|1d|1h|etc',
        description: 'Set the interval for time axis ticks',
        examples: [
          { label: 'Tick interval', code: 'gantt\n  dateFormat YYYY-MM-DD\n  tickInterval 1week\n  section Tasks\n    Task : 2024-01-01, 30d' },
        ],
      },
      {
        name: 'todayMarker',
        syntax: 'todayMarker stroke:#f00,stroke-width:5px',
        description: 'Style the vertical line marking today\'s date',
        examples: [
          { label: 'Today marker', code: 'gantt\n  dateFormat YYYY-MM-DD\n  todayMarker stroke:#ff0000,stroke-width:3px\n  section Now\n    Task : 2024-01-01, 10d' },
        ],
      },
      {
        name: 'section',
        syntax: 'section SectionName',
        description: 'Group tasks into a labeled horizontal section/row',
        examples: [
          { label: 'Section', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Design\n    Wireframes : 2024-01-01, 5d\n  section Development\n    Implementation : 2024-01-08, 10d' },
        ],
      },
      {
        name: 'simple task',
        syntax: 'Task Name : 2024-01-01, 5d',
        description: 'Basic task with start date and duration',
        examples: [
          { label: 'Simple', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Work\n    Task A : 2024-01-01, 5d' },
        ],
      },
      {
        name: 'task with id',
        syntax: 'Task : taskId, 2024-01-01, 5d',
        description: 'Task with identifier for dependencies',
        examples: [
          { label: 'With ID', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Sprint\n    Design : des, 2024-01-01, 5d\n    Dev : dev, after des, 7d' },
        ],
      },
      {
        name: 'task after dependency',
        syntax: 'Task : after prevTask, 5d',
        description: 'Task that starts after another task completes',
        examples: [
          { label: 'After', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Phases\n    Phase1 : p1, 2024-01-01, 5d\n    Phase2 : after p1, 7d' },
        ],
      },
      {
        name: 'done task',
        syntax: 'Task : done, 2024-01-01, 5d',
        description: 'Task marked as completed',
        examples: [
          { label: 'Done', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Status\n    Finished : done, 2024-01-01, 5d' },
        ],
      },
      {
        name: 'active task',
        syntax: 'Task : active, 2024-01-01, 5d',
        description: 'Task currently in progress',
        examples: [
          { label: 'Active', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Status\n    InProgress : active, 2024-01-10, 3d' },
        ],
      },
      {
        name: 'critical task',
        syntax: 'Task : crit, 2024-01-01, 5d',
        description: 'Task marked as critical/on critical path',
        examples: [
          { label: 'Critical', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Priority\n    Important : crit, 2024-01-01, 5d' },
        ],
      },
      {
        name: 'milestone',
        syntax: 'Milestone : milestone, 2024-01-01, 0d',
        description: 'Point-in-time marker (zero duration)',
        examples: [
          { label: 'Milestone', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Checkpoints\n    Launch : milestone, 2024-02-01, 0d' },
        ],
      },
      {
        name: 'combined task status',
        syntax: 'Task : crit,active, 2024-01-01, 5d',
        description: 'Task with multiple status flags',
        examples: [
          { label: 'Combined', code: 'gantt\n  dateFormat YYYY-MM-DD\n  section Tasks\n    Urgent : crit,active, 2024-01-01, 3d' },
        ],
      },
      {
        name: 'excludes',
        syntax: 'excludes weekends,2024-12-25',
        description: 'Exclude weekends and/or specific dates from timeline',
        examples: [
          { label: 'Exclude', code: 'gantt\n  dateFormat YYYY-MM-DD\n  excludes weekends\n  section Work\n    Task : 2024-01-01, 5d' },
        ],
      },
      {
        name: 'includes',
        syntax: 'includes 2024-12-25',
        description: 'Include specific dates in timeline',
        examples: [
          { label: 'Include', code: 'gantt\n  dateFormat YYYY-MM-DD\n  includes 2024-12-25\n  section Events\n    Holiday : 2024-12-25, 1d' },
        ],
      },
      {
        name: 'weekday setting',
        syntax: 'weekday monday,tuesday,wednesday',
        description: 'Specify which days are working days',
        examples: [
          { label: 'Weekdays', code: 'gantt\n  dateFormat YYYY-MM-DD\n  weekday saturday,sunday\n  section Work\n    Task : 2024-01-01, 7d' },
        ],
      },
    ],
  },

  pie: {
    id: 'pie',
    label: 'Pie Chart',
    elements: [
      {
        name: 'pie declaration',
        syntax: 'pie title "Title"',
        description: 'Declare a pie chart with optional title',
        examples: [
          { label: 'Basic pie', code: 'pie title Browser Share\n  "Chrome" : 63.5\n  "Safari" : 19.4' },
        ],
      },
      {
        name: 'showData',
        syntax: 'pie showData',
        description: 'Display raw numerical values alongside percentages',
        examples: [
          { label: 'Show values', code: 'pie showData title Sales\n  "Product A" : 450\n  "Product B" : 270' },
        ],
      },
      {
        name: 'data entry',
        syntax: '"Label" : value',
        description: 'Add a slice with label and numeric value',
        examples: [
          { label: 'Slices', code: 'pie\n  "Red" : 40\n  "Blue" : 35\n  "Green" : 25' },
        ],
      },
      {
        name: 'quoted label',
        syntax: '"Label with spaces" : value',
        description: 'Slice label with spaces (must be quoted)',
        examples: [
          { label: 'Quoted', code: 'pie title Categories\n  "Group A" : 100\n  "Group B" : 200' },
        ],
      },
    ],
  },

  gitGraph: {
    id: 'gitGraph',
    label: 'Git Graph',
    elements: [
      {
        name: 'gitGraph declaration',
        syntax: 'gitGraph',
        description: 'Declare a git commit graph diagram',
        examples: [
          { label: 'Basic', code: 'gitGraph\n  commit\n  commit\n  commit' },
        ],
      },
      {
        name: 'commit simple',
        syntax: 'commit',
        description: 'Add a commit to the current branch',
        examples: [
          { label: 'Simple', code: 'gitGraph\n  commit\n  commit' },
        ],
      },
      {
        name: 'commit with message',
        syntax: 'commit id: "message"',
        description: 'Commit with custom ID/message',
        examples: [
          { label: 'Message', code: 'gitGraph\n  commit id: "init"\n  commit id: "add feature"' },
        ],
      },
      {
        name: 'commit with tag',
        syntax: 'commit id: "msg" tag: "v1.0"',
        description: 'Commit with version tag label',
        examples: [
          { label: 'Tag', code: 'gitGraph\n  commit id: "release" tag: "v1.0"' },
        ],
      },
      {
        name: 'commit type NORMAL',
        syntax: 'commit type: NORMAL',
        description: 'Regular commit (default type)',
        examples: [
          { label: 'Normal', code: 'gitGraph\n  commit type: NORMAL\n  commit type: NORMAL' },
        ],
      },
      {
        name: 'commit type REVERSE',
        syntax: 'commit type: REVERSE',
        description: 'Reverse/undo commit visualization',
        examples: [
          { label: 'Reverse', code: 'gitGraph\n  commit\n  commit type: REVERSE' },
        ],
      },
      {
        name: 'commit type HIGHLIGHT',
        syntax: 'commit type: HIGHLIGHT',
        description: 'Highlighted/important commit',
        examples: [
          { label: 'Highlight', code: 'gitGraph\n  commit\n  commit type: HIGHLIGHT' },
        ],
      },
      {
        name: 'branch creation',
        syntax: 'branch branchName',
        description: 'Create and checkout a new branch',
        examples: [
          { label: 'Branch', code: 'gitGraph\n  commit\n  branch feature\n  commit' },
        ],
      },
      {
        name: 'branch with order',
        syntax: 'branch branchName order: 2',
        description: 'Create branch with specific display order',
        examples: [
          { label: 'Order', code: 'gitGraph\n  commit\n  branch f1 order: 1\n  branch f2 order: 2' },
        ],
      },
      {
        name: 'checkout branch',
        syntax: 'checkout branchName',
        description: 'Switch to a different branch',
        examples: [
          { label: 'Checkout', code: 'gitGraph\n  commit\n  branch dev\n  commit\n  checkout main\n  commit' },
        ],
      },
      {
        name: 'merge branch',
        syntax: 'merge branchName',
        description: 'Merge a branch into current branch',
        examples: [
          { label: 'Merge', code: 'gitGraph\n  commit\n  branch feature\n  commit\n  checkout main\n  merge feature' },
        ],
      },
      {
        name: 'merge with tag',
        syntax: 'merge branchName tag: "v1.1"',
        description: 'Merge with version tag',
        examples: [
          { label: 'Merge tag', code: 'gitGraph\n  commit\n  branch rel\n  commit\n  checkout main\n  merge rel tag: "v1.0"' },
        ],
      },
      {
        name: 'cherry-pick commit',
        syntax: 'cherry-pick id: "commitId"',
        description: 'Apply a specific commit to current branch',
        examples: [
          { label: 'Cherry-pick', code: 'gitGraph\n  commit id: "A"\n  branch b\n  commit id: "B"\n  checkout main\n  cherry-pick id: "A"' },
        ],
      },
      {
        name: 'LR direction',
        syntax: 'gitGraph LR',
        description: 'Display graph horizontally (left-right)',
        examples: [
          { label: 'Horizontal', code: 'gitGraph LR\n  commit\n  commit' },
        ],
      },
    ],
  },

  mindmap: {
    id: 'mindmap',
    label: 'Mindmap',
    elements: [
      {
        name: 'mindmap declaration',
        syntax: 'mindmap',
        description: 'Declare a mind map diagram',
        examples: [
          { label: 'Basic', code: 'mindmap\n  root((Topic))\n    Branch 1\n    Branch 2' },
        ],
      },
      {
        name: 'root node',
        syntax: 'root((Text))',
        description: 'Central node of the mindmap with circle brackets',
        examples: [
          { label: 'Root', code: 'mindmap\n  root((Project))\n    Planning\n    Execution' },
        ],
      },
      {
        name: 'default shape node',
        syntax: 'Text',
        description: 'Regular node (default shape, inherits from parent)',
        examples: [
          { label: 'Default', code: 'mindmap\n  root((Main))\n    Child 1\n      Grandchild\n    Child 2' },
        ],
      },
      {
        name: 'rounded node',
        syntax: '(Text)',
        description: 'Rounded rectangle node shape',
        examples: [
          { label: 'Rounded', code: 'mindmap\n  root((Center))\n    (Rounded 1)\n    (Rounded 2)' },
        ],
      },
      {
        name: 'rectangle node',
        syntax: '[Text]',
        description: 'Square/rectangular node shape',
        examples: [
          { label: 'Rectangle', code: 'mindmap\n  root((Main))\n    [Rectangle]\n    [Another]' },
        ],
      },
      {
        name: 'circle node',
        syntax: '((Text))',
        description: 'Circle node shape',
        examples: [
          { label: 'Circle', code: 'mindmap\n  root((Center))\n    ((Circle 1))\n    ((Circle 2))' },
        ],
      },
      {
        name: 'cloud node',
        syntax: ')Text(',
        description: 'Cloud/bubble node shape',
        examples: [
          { label: 'Cloud', code: 'mindmap\n  root((Main))\n    )Cloud 1(\n    )Cloud 2(' },
        ],
      },
      {
        name: 'bang node',
        syntax: '))Text((',
        description: 'Exclamation/bang node shape',
        examples: [
          { label: 'Bang', code: 'mindmap\n  root((Main))\n    ))Important((\n    ))Critical((' },
        ],
      },
      {
        name: 'hexagon node',
        syntax: '{{Text}}',
        description: 'Hexagon node shape',
        examples: [
          { label: 'Hexagon', code: 'mindmap\n  root((Main))\n    {{Hex 1}}\n    {{Hex 2}}' },
        ],
      },
      {
        name: 'icon attachment',
        syntax: '::icon(fa fa-iconname)',
        description: 'Attach FontAwesome icon to preceding node',
        examples: [
          { label: 'Icon', code: 'mindmap\n  root((App))\n    ::icon(fa fa-mobile)\n    Mobile\n    ::icon(fa fa-desktop)\n    Desktop' },
        ],
      },
      {
        name: 'class assignment',
        syntax: ':::className',
        description: 'Apply CSS class to a node',
        examples: [
          { label: 'Class', code: 'mindmap\n  root((Main))\n    :::important\n    Critical\n    Regular' },
        ],
      },
      {
        name: 'nested levels',
        syntax: 'indent for nesting',
        description: 'Indentation determines hierarchy depth',
        examples: [
          { label: 'Nested', code: 'mindmap\n  root((L0))\n    L1a\n      L2a\n        L3a\n    L1b' },
        ],
      },
    ],
  },

  timeline: {
    id: 'timeline',
    label: 'Timeline',
    elements: [
      {
        name: 'timeline declaration',
        syntax: 'timeline',
        description: 'Declare a timeline diagram',
        examples: [
          { label: 'Basic', code: 'timeline\n  1990 : Event 1\n  2000 : Event 2\n  2010 : Event 3' },
        ],
      },
      {
        name: 'title',
        syntax: 'title Timeline Title',
        description: 'Set the timeline diagram title',
        examples: [
          { label: 'With title', code: 'timeline\n  title History\n  1991 : HTML\n  1995 : JavaScript' },
        ],
      },
      {
        name: 'section',
        syntax: 'section SectionName',
        description: 'Group timeline events under a labeled section',
        examples: [
          { label: 'Section', code: 'timeline\n  section Early Web\n    1991 : HTML\n    1994 : CSS\n  section Modern Web\n    2015 : ES6\n    2020 : TypeScript' },
        ],
      },
      {
        name: 'single event',
        syntax: 'period : event',
        description: 'Single event at a time period',
        examples: [
          { label: 'Event', code: 'timeline\n  2010 : Smartphone boom\n  2015 : Cloud computing\n  2020 : AI revolution' },
        ],
      },
      {
        name: 'multiple events',
        syntax: 'period : event1 : event2 : event3',
        description: 'Multiple events at same period separated by colons',
        examples: [
          { label: 'Multiple', code: 'timeline\n  2020 : COVID-19 : Remote work\n  2021 : Vaccines : Digital surge' },
        ],
      },
      {
        name: 'multi-line event',
        syntax: 'period : Multi-line\n            : event text',
        description: 'Split event across multiple lines with continuation',
        examples: [
          { label: 'Multi-line', code: 'timeline\n  2015 : Major release\n       : with features\n       : and improvements' },
        ],
      },
    ],
  },

  quadrantChart: {
    id: 'quadrantChart',
    label: 'Quadrant',
    elements: [
      {
        name: 'quadrantChart declaration',
        syntax: 'quadrantChart',
        description: 'Declare a quadrant chart diagram',
        examples: [
          { label: 'Basic', code: 'quadrantChart\n  x-axis Left --> Right\n  y-axis Bottom --> Top\n  A: [0.5, 0.5]' },
        ],
      },
      {
        name: 'title',
        syntax: 'title Chart Title',
        description: 'Set the quadrant chart title',
        examples: [
          { label: 'Title', code: 'quadrantChart\n  title Priority Matrix\n  x-axis Low --> High\n  y-axis Low --> High' },
        ],
      },
      {
        name: 'x-axis',
        syntax: 'x-axis Label1 --> Label2',
        description: 'Define x-axis labels for left and right sides',
        examples: [
          { label: 'X-axis', code: 'quadrantChart\n  x-axis Low Impact --> High Impact\n  y-axis Low --> High\n  Item: [0.5, 0.5]' },
        ],
      },
      {
        name: 'y-axis',
        syntax: 'y-axis Label1 --> Label2',
        description: 'Define y-axis labels for bottom and top sides',
        examples: [
          { label: 'Y-axis', code: 'quadrantChart\n  x-axis Low --> High\n  y-axis Low Effort --> High Effort\n  Task: [0.5, 0.5]' },
        ],
      },
      {
        name: 'quadrant-1 label',
        syntax: 'quadrant-1 Label',
        description: 'Label for top-right quadrant',
        examples: [
          { label: 'Q1', code: 'quadrantChart\n  quadrant-1 Do First\n  x-axis Low --> High\n  y-axis Low --> High' },
        ],
      },
      {
        name: 'quadrant-2 label',
        syntax: 'quadrant-2 Label',
        description: 'Label for top-left quadrant',
        examples: [
          { label: 'Q2', code: 'quadrantChart\n  quadrant-2 Schedule\n  x-axis Low --> High\n  y-axis Low --> High' },
        ],
      },
      {
        name: 'quadrant-3 label',
        syntax: 'quadrant-3 Label',
        description: 'Label for bottom-left quadrant',
        examples: [
          { label: 'Q3', code: 'quadrantChart\n  quadrant-3 Delegate\n  x-axis Low --> High\n  y-axis Low --> High' },
        ],
      },
      {
        name: 'quadrant-4 label',
        syntax: 'quadrant-4 Label',
        description: 'Label for bottom-right quadrant',
        examples: [
          { label: 'Q4', code: 'quadrantChart\n  quadrant-4 Eliminate\n  x-axis Low --> High\n  y-axis Low --> High' },
        ],
      },
      {
        name: 'data point',
        syntax: 'Label: [x, y]',
        description: 'Plot a point with label at coordinates (0.0 to 1.0)',
        examples: [
          { label: 'Point', code: 'quadrantChart\n  x-axis Low --> High\n  y-axis Low --> High\n  Task A: [0.8, 0.7]\n  Task B: [0.3, 0.4]' },
        ],
      },
      {
        name: 'multiple data points',
        syntax: 'Item1: [x1, y1]\nItem2: [x2, y2]',
        description: 'Plot multiple points on the same chart',
        examples: [
          { label: 'Multiple', code: 'quadrantChart\n  x-axis Urgency\n  y-axis Importance\n  Feature A: [0.8, 0.9]\n  Feature B: [0.3, 0.2]\n  Feature C: [0.6, 0.5]' },
        ],
      },
    ],
  },

  xychart: {
    id: 'xychart',
    label: 'XY Chart',
    elements: [
      {
        name: 'xychart-beta declaration',
        syntax: 'xychart-beta',
        description: 'Declare an XY chart (beta feature)',
        examples: [
          { label: 'Basic', code: 'xychart-beta\n  x-axis [A, B, C]\n  y-axis 0 --> 100\n  line [30, 60, 45]' },
        ],
      },
      {
        name: 'title',
        syntax: 'title "Chart Title"',
        description: 'Set the chart title',
        examples: [
          { label: 'Title', code: 'xychart-beta\n  title "Sales Trend"\n  x-axis [Jan, Feb, Mar]\n  y-axis 0 --> 1000' },
        ],
      },
      {
        name: 'x-axis categorical',
        syntax: 'x-axis [cat1, cat2, cat3]',
        description: 'Define x-axis with categorical labels',
        examples: [
          { label: 'Categories', code: 'xychart-beta\n  x-axis [Q1, Q2, Q3, Q4]\n  y-axis 0 --> 100\n  bar [40, 60, 55, 80]' },
        ],
      },
      {
        name: 'x-axis range',
        syntax: 'x-axis min --> max',
        description: 'Define x-axis with numeric range',
        examples: [
          { label: 'Range', code: 'xychart-beta\n  x-axis 0 --> 100\n  y-axis 0 --> 50\n  line [10, 20, 30, 40, 50]' },
        ],
      },
      {
        name: 'y-axis',
        syntax: 'y-axis "Label" min --> max',
        description: 'Define y-axis with optional label and numeric range',
        examples: [
          { label: 'Y-axis', code: 'xychart-beta\n  x-axis [A, B, C, D]\n  y-axis "Revenue" 0 --> 10000\n  bar [2000, 4500, 3200, 6100]' },
        ],
      },
      {
        name: 'bar chart',
        syntax: 'bar [val1, val2, val3, ...]',
        description: 'Add a bar chart series with values',
        examples: [
          { label: 'Bar', code: 'xychart-beta\n  x-axis [Mon, Tue, Wed, Thu, Fri]\n  y-axis 0 --> 500\n  bar [120, 230, 190, 310, 280]' },
        ],
      },
      {
        name: 'line chart',
        syntax: 'line [val1, val2, val3, ...]',
        description: 'Add a line chart series with values',
        examples: [
          { label: 'Line', code: 'xychart-beta\n  x-axis [Jan, Feb, Mar, Apr, May]\n  y-axis 0 --> 100\n  line [20, 45, 38, 70, 65]' },
        ],
      },
      {
        name: 'named bar series',
        syntax: 'bar "Series Name" [val1, val2, ...]',
        description: 'Bar series with legend name',
        examples: [
          { label: 'Named bar', code: 'xychart-beta\n  x-axis [2022, 2023, 2024]\n  y-axis 0 --> 100\n  bar "Product A" [30, 50, 70]' },
        ],
      },
      {
        name: 'named line series',
        syntax: 'line "Series Name" [val1, val2, ...]',
        description: 'Line series with legend name',
        examples: [
          { label: 'Named line', code: 'xychart-beta\n  x-axis [Q1, Q2, Q3, Q4]\n  y-axis 0 --> 100\n  line "Sales" [40, 60, 55, 80]' },
        ],
      },
      {
        name: 'multiple series',
        syntax: 'bar [...]\nline [...]\nbar [...]',
        description: 'Plot multiple data series on same chart',
        examples: [
          { label: 'Multiple', code: 'xychart-beta\n  x-axis [Jan, Feb, Mar]\n  y-axis 0 --> 100\n  bar "A" [30, 40, 50]\n  line "B" [20, 35, 45]' },
        ],
      },
    ],
  },
  architecture: {
    id: 'architecture',
    label: 'Architecture',
    elements: [
      {
        name: 'architecture-beta',
        syntax: 'architecture-beta',
        description: 'Declares an architecture diagram (beta)',
        examples: [
          { label: 'Basic', code: 'architecture-beta\n  service api(server)[API Server]' },
        ],
      },
      {
        name: 'service',
        syntax: 'service <id>(<icon>)[<label>]',
        description: 'Defines a service node with an icon shape and label',
        examples: [
          { label: 'Server', code: 'architecture-beta\n  service api(server)[API Server]' },
          { label: 'Database', code: 'architecture-beta\n  service db(database)[PostgreSQL]' },
        ],
      },
      {
        name: 'group',
        syntax: 'group <id>(<icon>)[<label>]',
        description: 'Groups services together visually',
        examples: [
          { label: 'Cloud group', code: 'architecture-beta\n  group cloud(cloud)[AWS Cloud]\n  service api(server)[API] in cloud\n  service db(database)[DB] in cloud' },
        ],
      },
      {
        name: 'in',
        syntax: 'service <id>(<icon>)[<label>] in <group>',
        description: 'Places a service inside a group',
        examples: [
          { label: 'Service in group', code: 'architecture-beta\n  group vpc(cloud)[VPC]\n  service web(server)[Web] in vpc' },
        ],
      },
      {
        name: 'junction',
        syntax: 'junction <id>',
        description: 'A connection point for routing edges through',
        examples: [
          { label: 'Junction', code: 'architecture-beta\n  service a(server)[A]\n  service b(server)[B]\n  junction junc\n  a:R --> L:junc\n  junc:R --> L:b' },
        ],
      },
      {
        name: 'edge (-->)',
        syntax: '<service>:<side> --> <side>:<service>',
        description: 'Connects two services. Sides: T (top), B (bottom), L (left), R (right)',
        examples: [
          { label: 'Left to right', code: 'architecture-beta\n  service a(server)[App]\n  service b(database)[DB]\n  a:R --> L:b' },
          { label: 'Top to bottom', code: 'architecture-beta\n  service a(server)[App]\n  service b(database)[DB]\n  a:B --> T:b' },
        ],
      },
      {
        name: 'edge (<-->)',
        syntax: '<service>:<side> <--> <side>:<service>',
        description: 'Bidirectional connection between services',
        examples: [
          { label: 'Bidirectional', code: 'architecture-beta\n  service a(server)[App A]\n  service b(server)[App B]\n  a:R <--> L:b' },
        ],
      },
      {
        name: 'icon shapes',
        syntax: '(cloud), (server), (database), (internet), (disk), (firewall), (users)',
        description: 'Built-in icon shapes for service nodes',
        examples: [
          { label: 'All shapes', code: 'architecture-beta\n  service a(cloud)[Cloud]\n  service b(server)[Server]\n  service c(database)[DB]\n  service d(internet)[Internet]\n  service e(disk)[Disk]' },
        ],
      },
    ],
  },
}

export const GENERIC_REF: DiagramRef = {
  id: 'generic',
  label: 'Diagram',
  elements: [
    {
      name: '%%',
      syntax: '%% comment text',
      description: 'Single-line comment — ignored by the parser',
      examples: [
        { label: 'Comment', code: 'flowchart TD\n  %% This is a comment\n  A --> B' },
      ],
    },
  ],
}

export function getRef(diagramType: string): DiagramRef {
  return DIAGRAM_REFS[diagramType] ?? GENERIC_REF
}
