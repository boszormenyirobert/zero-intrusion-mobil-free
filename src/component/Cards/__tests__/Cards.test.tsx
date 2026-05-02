import React from 'react';
import { TouchableOpacity } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Cards from '../Cards';

describe('Cards', () => {
  it('invokes the action for single-row cards', async () => {
    const action = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Cards type="scanCode" action={action} icon="qr_code" />,
      );
    });

    await act(async () => {
      renderer!.root.findByType(TouchableOpacity).props.onPress();
    });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('blocks multi-row actions when disabled and allows them when enabled', async () => {
    const action = jest.fn();
    let disabledRenderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      disabledRenderer = ReactTestRenderer.create(
        <Cards
          type="biometric"
          action={action}
          icon="biometric"
          singleRow={false}
          enabled={false}
          position="left"
          messageState
        />,
      );
    });

    await act(async () => {
      disabledRenderer!.root.findByType(TouchableOpacity).props.onPress();
    });
    expect(action).not.toHaveBeenCalled();

    let enabledRenderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      enabledRenderer = ReactTestRenderer.create(
        <Cards
          type="stop"
          action={action}
          icon="stop"
          singleRow={false}
          enabled
          position="right"
        />,
      );
    });

    await act(async () => {
      enabledRenderer!.root.findByType(TouchableOpacity).props.onPress();
    });
    expect(action).toHaveBeenCalledTimes(1);
  });
});
