import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../services/Icons', () => ({
  icons: {
    qr_show: 'qr_show',
    qr_read: 'qr_read',
  },
}));

jest.mock('../../../services/Clone/Sender', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockSender() {
    return React.createElement(Text, null, 'SENDER_VIEW');
  };
});

jest.mock('../../AutoQRScanner/AutoQRScanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockAutoQRScanner() {
    return React.createElement(Text, null, 'RECEIVER_VIEW');
  };
});

import Clone from '../Clone';

describe('Clone view', () => {
  const getPressables = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAll(node => typeof node.props.onPress === 'function');

  it('switches to sender and receiver subviews', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Clone onResult={jest.fn()} setView={jest.fn()} />,
      );
    });

    await act(async () => {
      renderer!.root.findAllByType(TouchableOpacity)[0].props.onPress();
    });
    expect(renderer!.root.findAllByType(Text).map(node => node.props.children)).toContain('SENDER_VIEW');

    let receiverRenderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      receiverRenderer = ReactTestRenderer.create(
        <Clone onResult={jest.fn()} setView={jest.fn()} />,
      );
    });
    await act(async () => {
      receiverRenderer!.root.findAllByType(TouchableOpacity)[1].props.onPress();
    });
    expect(receiverRenderer!.root.findAllByType(Text).map(node => node.props.children)).toContain('RECEIVER_VIEW');
  });

  it('navigates back to the default view', async () => {
    const setView = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Clone onResult={jest.fn()} setView={setView} />,
      );
    });

    await act(async () => {
      getPressables(renderer!).at(-1)!.props.onPress();
    });
    expect(setView).toHaveBeenCalledWith('default');

    const backButton = renderer!.root.findAll(node => typeof node.props.style === 'function').at(-1)!;
    backButton.props.style({ pressed: true });
    backButton.props.style({ pressed: false });
  });

  it('ignores unsupported clone option keys', async () => {
    const originalEntries = Object.entries;
    const entriesSpy = jest.spyOn(Object, 'entries').mockImplementation((value: object) => {
      const entries = originalEntries(value);

      if (entries.length === 2 && entries[0][0] === 'sender' && entries[1][0] === 'receiver') {
        return [['unsupported', (value as Record<string, unknown>).sender], ...entries];
      }

      return entries;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Clone onResult={jest.fn()} setView={jest.fn()} />,
      );
    });

    await act(async () => {
      renderer!.root.findAllByType(TouchableOpacity)[0].props.onPress();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).not.toContain('SENDER_VIEW');
    expect(texts).not.toContain('RECEIVER_VIEW');

    entriesSpy.mockRestore();
  });

  it('handles the back button safely when no view setter is provided', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Clone onResult={jest.fn()} setView={undefined as never} />,
      );
    });

    await act(async () => {
      getPressables(renderer!).at(-1)!.props.onPress();
    });

    expect(renderer!.root.findAllByType(Text).map(node => node.props.children)).toContain(
      'clone.sender.title',
    );
  });
});
