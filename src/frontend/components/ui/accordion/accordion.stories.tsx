import type { Meta, StoryObj } from '@storybook/react-vite';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

const items = [
  {
    value: 'item-1',
    title: 'What is Party PDF?',
    content: 'Party PDF is a collaborative space for organizing, annotating, and sharing PDF documents with your team.',
  },
  {
    value: 'item-2',
    title: 'Can I export my notes?',
    content:
      'Yes. You can export highlights and comments as markdown, plain text, or a structured JSON format for downstream automation.',
  },
  {
    value: 'item-3',
    title: 'How do permissions work?',
    content:
      'Permissions are project-based. Owners can invite editors and viewers, and each document inherits access from its parent project.',
  },
];

const meta = {
  title: 'Components/UI/Accordion',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className='w-[560px] max-w-[90vw]'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <Accordion type='single' collapsible>
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type='multiple' defaultValue={['item-1', 'item-3']}>
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <Accordion type='single' defaultValue='item-2' collapsible>
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const NoCollapse: Story = {
  render: () => (
    <Accordion type='single' defaultValue='item-1' collapsible={false}>
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};
