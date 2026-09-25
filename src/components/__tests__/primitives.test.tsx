import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const slot = (name: string) => document.querySelector(`[data-slot=${name}]`);

function MarchDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>調兵出征</DialogTitle>
        <DialogDescription>由漢中出發，結束本回合後抵達。</DialogDescription>
        <Select value="hanzhong" onValueChange={() => {}}>
          <SelectTrigger>
            <SelectValue>漢中</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hanzhong">漢中 · 友軍</SelectItem>
            <SelectItem value="yongan">永安 · 群雄勢力</SelectItem>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('renders through a portal and closes on Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>軍師錦囊</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(slot('dialog-content')).not.toBeNull();
    expect(document.body.contains(slot('dialog-content'))).toBe(true);

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when the overlay is pressed', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>軍師錦囊</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(slot('dialog-overlay')!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('moves focus inside when it opens and hands it back when it closes', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>開啟錦囊</button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>逐鹿天下</DialogTitle>
              <button>起兵出征</button>
            </DialogContent>
          </Dialog>
        </>
      );
    }
    render(<Harness />);

    const opener = screen.getByText('開啟錦囊');
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement?.textContent).toBe('起兵出征');

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(document.activeElement).toBe(opener);
  });
});

describe('AlertDialog', () => {
  it('holds its ground on an outside press but cancels from its button', () => {
    const onOpenChange = vi.fn();
    const onCancel = vi.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogTitle>另啟新局</AlertDialogTitle>
          <AlertDialogDescription>
            當前自動存檔將被新戰局替換。
          </AlertDialogDescription>
          <AlertDialogCancel onClick={onCancel}>繼續當前戰局</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );

    fireEvent.click(slot('alert-dialog-overlay')!);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('繼續當前戰局'));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Select', () => {
  function Controlled({ onChange = () => {} }: { onChange?: (value: string) => void }) {
    return (
      <Select value="hanzhong" onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue>漢中</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hanzhong">漢中 · 友軍</SelectItem>
          <SelectItem value="yongan">永安 · 群雄勢力</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  it('opens on the trigger, marks the current value and reports a choice', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    expect(slot('select-content')).toBeNull();

    fireEvent.click(screen.getByRole('combobox'));
    const items = document.querySelectorAll('[data-slot=select-item]');
    expect(items.length).toBe(2);
    expect(items[0].hasAttribute('data-selected')).toBe(true);

    fireEvent.click(items[1]);
    expect(onChange).toHaveBeenCalledWith('yongan');
    expect(slot('select-content')).toBeNull();
  });

  it('walks the options with the arrow keys and chooses with Enter', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(document.activeElement?.textContent).toContain('漢中');

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('永安');

    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('yongan');
  });

  it('dismisses itself on an outside press', () => {
    render(<Controlled />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(slot('select-content')).not.toBeNull();

    fireEvent.pointerDown(document.body);
    expect(slot('select-content')).toBeNull();
  });

  it('closes the popup before the dialog that contains it', () => {
    // One Escape used to close the popup and the dialog together.
    const onOpenChange = vi.fn();
    render(<MarchDialog onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(slot('select-content')).not.toBeNull();

    act(() => {
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    });
    expect(slot('select-content')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Slider', () => {
  it('steps, pages and jumps with the keyboard', () => {
    const onValueChange = vi.fn();
    render(
      <Slider
        value={[5000]}
        onValueChange={onValueChange}
        min={1000}
        max={9000}
        step={500}
        aria-label="出征兵力"
      />,
    );
    const thumb = screen.getByRole('slider');

    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenLastCalledWith([5500]);
    fireEvent.keyDown(thumb, { key: 'ArrowLeft' });
    expect(onValueChange).toHaveBeenLastCalledWith([4500]);
    fireEvent.keyDown(thumb, { key: 'PageUp' });
    expect(onValueChange).toHaveBeenLastCalledWith([7500]);
    fireEvent.keyDown(thumb, { key: 'Home' });
    expect(onValueChange).toHaveBeenLastCalledWith([1000]);
    fireEvent.keyDown(thumb, { key: 'End' });
    expect(onValueChange).toHaveBeenLastCalledWith([9000]);
  });

  it('reports the position it holds', () => {
    render(<Slider value={[3000]} min={1000} max={9000} step={500} aria-label="出征兵力" />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('aria-valuenow')).toBe('3000');
    expect(thumb.getAttribute('aria-valuemin')).toBe('1000');
    expect(thumb.getAttribute('aria-valuemax')).toBe('9000');
  });

  it('stays put at its bounds and when disabled', () => {
    const onValueChange = vi.fn();
    const { unmount } = render(
      <Slider value={[9000]} onValueChange={onValueChange} min={1000} max={9000} step={500} />,
    );
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onValueChange).not.toHaveBeenCalled();
    unmount();

    render(
      <Slider
        value={[5000]}
        onValueChange={onValueChange}
        min={1000}
        max={9000}
        step={500}
        disabled
      />,
    );
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('tabindex')).toBe('-1');
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('Tabs', () => {
  it('swaps panels and marks the active trigger', () => {
    render(
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">玩法說明</TabsTrigger>
          <TabsTrigger value="saves">存檔管理</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">經營城池</TabsContent>
        <TabsContent value="saves">匯出當前存檔</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('經營城池')).toBeTruthy();
    expect(screen.getByText('玩法說明').getAttribute('data-active')).toBe('');

    fireEvent.click(screen.getByText('存檔管理'));
    expect(screen.getByText('匯出當前存檔')).toBeTruthy();
    expect(screen.queryByText('經營城池')).toBeNull();
    expect(screen.getByText('存檔管理').getAttribute('data-active')).toBe('');
  });
});
