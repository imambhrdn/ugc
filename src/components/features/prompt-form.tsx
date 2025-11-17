'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GenerationType } from '@/lib/types';

const formSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt is required' }).max(1000, { message: 'Prompt must be less than 1000 characters' }),
  type: z.enum(['text_to_prompt', 'image', 'video'] as const, {
    required_error: 'Please select a generation type',
  }),
});

interface PromptFormProps {
  onGenerate: (prompt: string, type: GenerationType) => void;
  isGenerating: boolean;
}

export function PromptForm({ onGenerate, isGenerating }: PromptFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      type: 'image',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onGenerate(values.prompt, values.type);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what you want to generate..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Generation Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a generation type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="text_to_prompt">Text Enhancement</SelectItem>
                  <SelectItem value="image">Image Generation</SelectItem>
                  <SelectItem value="video">Video Generation</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Content'}
        </Button>
      </form>
    </Form>
  );
}