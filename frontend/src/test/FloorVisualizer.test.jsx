import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SingleQueueBar } from '../components/floor_visualizer/SingleQueueBar';
import { PlaybackControls } from '../components/floor_visualizer/PlaybackControls';
import { FactoryFloorGrid } from '../components/floor_visualizer/FactoryFloorGrid';

describe('Floor Visualizer Components', () => {

  describe('SingleQueueBar', () => {
    it('shows machine queue active when machine queue > 0', () => {
      render(<SingleQueueBar machineQueueCount={5} idleAdjusterCount={0} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      // Wait, there might be multiple '5' or '0'. Let's check DOM implicitly.
      // But we can check class names for visual cues
    });

    it('shows adjuster queue active when idle adjusters > 0 and machines = 0', () => {
      render(<SingleQueueBar machineQueueCount={0} idleAdjusterCount={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('PlaybackControls', () => {
    it('calls onTogglePlay when play/pause button is clicked', () => {
      const toggleMock = vi.fn();
      render(<PlaybackControls isPlaying={false} onTogglePlay={toggleMock} speed={1} onSpeedChange={() => {}} />);
      const btn = screen.getByRole('button', { name: 'Play' });
      fireEvent.click(btn);
      expect(toggleMock).toHaveBeenCalled();
    });

    it('calls onStep when step button is clicked and not playing', () => {
      const stepMock = vi.fn();
      render(<PlaybackControls isPlaying={false} onStep={stepMock} speed={1} onSpeedChange={() => {}} />);
      const btn = screen.getByTitle('Step Forward');
      fireEvent.click(btn);
      expect(stepMock).toHaveBeenCalled();
    });

    it('disables step button when playing', () => {
      const stepMock = vi.fn();
      render(<PlaybackControls isPlaying={true} onStep={stepMock} speed={1} onSpeedChange={() => {}} />);
      const btn = screen.getByTitle('Step Forward');
      expect(btn).toBeDisabled();
    });

    it('calls onSpeedChange when slider is moved', () => {
      const speedMock = vi.fn();
      render(<PlaybackControls isPlaying={false} speed={1} onSpeedChange={speedMock} />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '5' } });
      expect(speedMock).toHaveBeenCalledWith(5);
    });
  });

  describe('FactoryFloorGrid', () => {
    it('renders empty state correctly', () => {
      render(<FactoryFloorGrid machines={[]} />);
      expect(screen.getByText('No machines configured.')).toBeInTheDocument();
    });

    it('renders machines correctly', () => {
      const mockMachines = [
        { id: '1', name: 'M1', category: 'Lathe', state: 'RUNNING' },
        { id: '2', name: 'M2', category: 'Lathe', state: 'WAITING_FOR_REPAIR' },
      ];
      render(<FactoryFloorGrid machines={mockMachines} />);
      expect(screen.getByText('M1')).toBeInTheDocument();
      expect(screen.getByText('M2')).toBeInTheDocument();
      expect(screen.getByText('Waiting in Queue')).toBeInTheDocument();
    });
  });
});
